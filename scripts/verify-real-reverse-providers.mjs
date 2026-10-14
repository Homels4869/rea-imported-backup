#!/usr/bin/env node
/**
 * Real-provider verification for the caller-supplied reverse-engineering tools.
 *
 * Verifies objdump, Rizin and GDB against the installed binaries through the
 * public CLI and MCP surfaces, records observed versions and cleanup, and fails
 * when a claim cannot be established. `docs/testing.md` requires this lane for
 * engine adapters; an injected provider does not establish real-provider
 * behavior.
 *
 * Usage: node scripts/verify-real-reverse-providers.mjs [objdump] [rizin] [gdb]
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const requested = process.argv
  .slice(2)
  .filter((value) => !value.startsWith("-"));
const providers =
  requested.length === 0 ? ["objdump", "rizin", "gdb"] : requested;
const receiptPath = join(root, "reverse-providers-real.json");
const receipt = {
  ran_at_utc: new Date().toISOString(),
  host: {
    platform: process.platform,
    arch: process.arch,
    kernel: null,
    locale: null,
  },
  providers: {},
  assertions: [],
  cleaned_up: {},
  unknowns: [],
};

let failures = 0;
const check = (name, passed, detail) => {
  receipt.assertions.push({ name, passed: passed === true, detail });
  if (passed !== true) {
    failures += 1;
    console.error(`FAIL ${name}: ${detail}`);
  } else {
    console.log(`ok   ${name}`);
  }
};

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C", ...options.env },
    ...options,
  }).trim();

const firstLine = (command, args) => {
  try {
    return run(command, args).split("\n")[0] ?? null;
  } catch {
    return null;
  }
};

const digest = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

const countProcesses = (name) => {
  const output = run("sh", ["-c", `ps -eo comm= | grep -cx '${name}' || true`]);
  return Number(output);
};

const cli = (args) =>
  JSON.parse(
    run(process.execPath, [
      join(root, "scripts/rea.mjs"),
      ...args,
      "--format",
      "json",
    ]),
  );

const cliFailure = (args) => {
  try {
    run(process.execPath, [
      join(root, "scripts/rea.mjs"),
      ...args,
      "--format",
      "json",
    ]);
    return null;
  } catch (cause) {
    return String(cause.stdout ?? cause.message ?? cause).slice(0, 400);
  }
};

/** Allocate a real terminal for a live inferior and hand back its device path. */
const openInferiorTty = () =>
  new Promise((resolvePromise, reject) => {
    const helper = spawn(
      "python3",
      [
        "-c",
        [
          "import os, pty, select, sys",
          "master, slave = pty.openpty()",
          "print(os.ttyname(slave), flush=True)",
          "while True:",
          "    ready, _, _ = select.select([master, sys.stdin], [], [], 1)",
          "    if sys.stdin in ready and not sys.stdin.readline():",
          "        break",
          "    if master in ready:",
          "        try: os.read(master, 65536)",
          "        except OSError: break",
        ].join("\n"),
      ],
      { stdio: ["pipe", "pipe", "inherit"] },
    );
    let buffered = "";
    const onData = (chunk) => {
      buffered += chunk.toString();
      const newline = buffered.indexOf("\n");
      if (newline < 0) return;
      helper.stdout.off("data", onData);
      resolvePromise({ helper, path: buffered.slice(0, newline).trim() });
    };
    helper.stdout.on("data", onData);
    helper.once("error", reject);
    setTimeout(
      () => reject(new Error("inferior TTY helper did not report a path")),
      10_000,
    );
  });

const verifyObjdump = async (fixture, expectedDigest) => {
  const observed = {
    version: firstLine("objdump", ["--version"]),
    operations: {},
  };
  receipt.providers.objdump = observed;
  for (const operation of [
    "file_headers",
    "section_headers",
    "symbols",
    "relocations",
    "dwarf",
    "disassemble",
    "disassemble_all",
  ]) {
    const evidence = cli(["inspect-with-objdump", fixture, operation]);
    const result = evidence.raw_result ?? {};
    observed.operations[operation] = {
      exit_code: result.exit_code,
      stdout_bytes:
        typeof result.stdout === "string" ? result.stdout.length : 0,
      artifact_changed: result.artifact_changed,
      completion_status: result.completion_status,
    };
    check(
      `objdump ${operation} ran against the installed binary`,
      result.exit_code === 0 &&
        result.completion_status === "complete" &&
        typeof result.stdout === "string" &&
        result.stdout.length > 0,
      JSON.stringify(observed.operations[operation]),
    );
    check(
      `objdump ${operation} preserved artifact identity`,
      result.artifact_changed === false &&
        result.artifact_sha256_after === expectedDigest,
      `after=${result.artifact_sha256_after} changed=${result.artifact_changed}`,
    );
    check(
      `objdump ${operation} recorded the caller operation and provider executable`,
      evidence.parameters?.operation === operation &&
        evidence.parameters?.provider_executable !== undefined,
      JSON.stringify(evidence.parameters),
    );
  }
  if (process.argv.includes("--architectures")) {
    observed.architectures = cli([
      "inspect-with-objdump",
      fixture,
      "architectures",
    ]).raw_result;
  } else {
    receipt.unknowns.push(
      "objdump architectures capability probing is exposed through MCP only; the CLI enum omits it",
    );
  }
};

const verifyRizin = async (fixture, expectedDigest) => {
  const observed = { version: firstLine("rizin", ["-v"]) };
  receipt.providers.rizin = observed;
  const evidence = cli(["execute-rizin-command", fixture, "iI"]);
  const result = evidence.raw_result ?? {};
  observed.operation = {
    exit_code: result.exit_code,
    stdout_head: String(result.stdout ?? "")
      .split("\n")
      .slice(0, 2),
    artifact_changed: result.artifact_changed,
  };
  check(
    "rizin ran the caller-selected command",
    result.exit_code === 0 && String(result.stdout ?? "").includes("arch"),
    JSON.stringify(observed.operation),
  );
  check(
    "rizin Evidence keeps the caller command and separates the provider executable",
    evidence.parameters?.command === "iI" &&
      typeof evidence.parameters?.provider_executable === "string" &&
      evidence.parameters.provider_executable.includes("rizin"),
    JSON.stringify(evidence.parameters),
  );
  check(
    "rizin preserved artifact identity",
    result.artifact_changed === false &&
      result.artifact_sha256_after === expectedDigest,
    `after=${result.artifact_sha256_after} changed=${result.artifact_changed}`,
  );
};

const callTool = async (client, name, args) => {
  const response = await client.callTool({ name, arguments: args });
  return response;
};

const structured = (response) => response.structuredContent ?? {};

const verifyGdb = async (fixture, expectedDigest) => {
  const observed = { version: firstLine("gdb", ["--version"]) };
  receipt.providers.gdb = observed;
  const before = countProcesses("gdb");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(root, "scripts/rea.mjs"), "mcp"],
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", REA_LOG_LEVEL: "silent" },
    stderr: "pipe",
  });
  const client = new Client({ name: "rea-real-reverse-tools", version: "1" });
  await client.connect(transport);
  const { helper, path: inferiorTty } = await openInferiorTty();
  observed.inferior_tty = inferiorTty;
  try {
    const started = structured(
      await callTool(client, "start_gdb_session", {
        inferior_tty: inferiorTty,
      }),
    );
    observed.mi_version = started.mi_version;
    check(
      "gdb started a persistent MI session",
      typeof started.session_id === "string" &&
        (started.mi_version === "mi3" || started.mi_version === "mi2"),
      JSON.stringify(started),
    );
    const sessionId = started.session_id;
    if (typeof sessionId !== "string") return;

    for (const command of [
      `file ${fixture}`,
      "break main",
      "run",
      "info registers rip",
    ]) {
      const response = await callTool(client, "gdb_console", {
        session_id: sessionId,
        command,
      });
      const result = structured(response).raw_result ?? {};
      check(
        `gdb console ran ${JSON.stringify(command)}`,
        response.isError !== true &&
          typeof result.mi === "string" &&
          result.mi.length > 0,
        JSON.stringify({
          mi: result.mi,
          console: result.console?.slice(0, 60),
        }),
      );
    }

    const status = structured(
      await callTool(client, "gdb_session_status", { session_id: sessionId }),
    );
    observed.status = {
      state: status.state,
      mi_version: status.mi_version,
      inferior_tty: status.inferior_tty,
      inferior_tty_verified: status.inferior_tty_verified,
    };
    check(
      "gdb verified the caller-selected inferior TTY against the running debugger",
      status.state === "ready" && status.inferior_tty_verified === true,
      JSON.stringify(observed.status),
    );

    const closed = structured(
      await callTool(client, "close_gdb_session", { session_id: sessionId }),
    );
    observed.close = closed;
    check(
      "gdb closed the session with an explicit target state",
      closed.target_state === "none_observed" ||
        closed.target_state === "unknown",
      JSON.stringify(closed),
    );
  } finally {
    await client.close();
    await transport.close();
    helper.stdin?.end();
    helper.kill("SIGKILL");
  }

  await new Promise((resolveWait) => setTimeout(resolveWait, 1_000));
  const after = countProcesses("gdb");
  receipt.cleaned_up.gdb_processes = { before, after };
  check(
    "gdb left no owned debugger process behind",
    after <= before,
    `before=${before} after=${after}`,
  );
  check(
    "the verified inferior did not change the artifact",
    digest(fixture) === expectedDigest,
    `digest=${digest(fixture).slice(0, 12)}`,
  );

  const controlTty = await openInferiorTty();
  observed.one_shot = {};
  try {
    const accepted = cli([
      "debug-with-gdb",
      "info files",
      "--inferior-tty",
      controlTty.path,
    ]);
    observed.one_shot.accepted = (accepted.raw_result ?? {}).completion_status;
    check(
      "gdb one-shot accepted an ordinary console command",
      typeof accepted.evidence_id === "string",
      JSON.stringify(observed.one_shot.accepted),
    );
    for (const command of [
      "shell echo contained",
      "!echo contained",
      "info files &",
    ]) {
      const failure = cliFailure([
        "debug-with-gdb",
        command,
        "--inferior-tty",
        controlTty.path,
      ]);
      observed.one_shot[command] = failure === null ? "accepted" : "rejected";
      check(
        `gdb one-shot rejected ${JSON.stringify(command)}`,
        failure !== null,
        observed.one_shot[command],
      );
    }
  } finally {
    controlTty.helper.stdin?.end();
    controlTty.helper.kill("SIGKILL");
  }
};

const buildFixture = () => {
  const directory = mkdtempSync(join(tmpdir(), "rea-real-reverse-providers-"));
  const source = join(directory, "target.c");
  const binary = join(directory, "target.bin");
  writeFileSync(
    source,
    [
      "#include <stdio.h>",
      "static int step(int value) { return value * 3 + 1; }",
      "int main(void) {",
      "  int accumulated = 0;",
      "  for (int index = 0; index < 4; index += 1) accumulated += step(index);",
      '  printf("%d\\n", accumulated);',
      "  return accumulated > 0 ? 0 : 1;",
      "}",
      "",
    ].join("\n"),
  );
  run("cc", ["-g", "-O0", "-o", binary, source]);
  return { directory, binary };
};

receipt.host.kernel = firstLine("uname", ["-sr"]);
receipt.host.locale = process.env.LC_ALL ?? process.env.LANG ?? null;

let fixtureDirectory;
try {
  const { directory, binary } = buildFixture();
  fixtureDirectory = directory;
  const expectedDigest = digest(binary);
  receipt.fixture = { path: binary, sha256: expectedDigest };

  for (const provider of providers) {
    if (provider === "objdump") await verifyObjdump(binary, expectedDigest);
    else if (provider === "rizin") await verifyRizin(binary, expectedDigest);
    else if (provider === "gdb") await verifyGdb(binary, expectedDigest);
    else {
      receipt.unknowns.push(`unknown provider argument ${provider}`);
      failures += 1;
    }
  }
} catch (cause) {
  receipt.unknowns.push(
    `lane failure: ${cause instanceof Error ? cause.message : String(cause)}`,
  );
  failures += 1;
} finally {
  if (fixtureDirectory !== undefined)
    rmSync(fixtureDirectory, { recursive: true, force: true });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`\nreceipt: ${receiptPath}`);
  console.log(
    `providers=${providers.join(",")} assertions=${receipt.assertions.length} failed=${failures}`,
  );
  if (receipt.unknowns.length > 0)
    console.log(`unknowns: ${receipt.unknowns.join(" | ")}`);
  process.exitCode = failures === 0 ? 0 : 1;
}
