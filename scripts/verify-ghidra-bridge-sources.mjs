#!/usr/bin/env node
// Compile the packaged Ghidra bridge sources against an existing Ghidra
// installation's jars. Ghidra's script provider compiles the whole bridge
// directory when a session starts, so one unresolved symbol disables every
// operation and surfaces only after import and auto-analysis. This check
// reports the same javac diagnostics without launching Ghidra or selecting,
// importing or executing a target.
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bridge = join(root, "bridge/ghidra");
const install = process.env.GHIDRA_INSTALL_DIR;
if (!install)
  fail(
    "Set GHIDRA_INSTALL_DIR to an existing Ghidra 12.1.x installation (verified with 12.1.4). REA does not install Ghidra.",
  );
const properties = await readFile(
  join(install, "Ghidra/application.properties"),
  "utf8",
).catch((cause) =>
  fail(
    `GHIDRA_INSTALL_DIR has no readable Ghidra/application.properties: ${cause.message}`,
  ),
);
const version = /^application\.version=(.*)$/mu.exec(properties)?.[1]?.trim();
// Same 12.1 line as GhidraInstallationPolicy, including a distro suffix.
if (!/^12\.1(?:\.\d+)?(?:[-+].*)?$/u.test(version ?? ""))
  fail(
    `Bridge sources are compiled against Ghidra 12.1.x (verified with 12.1.4). Observed application.version=${version || "missing"}.`,
  );
const javac = process.env.JAVA_HOME
  ? join(process.env.JAVA_HOME, "bin", "javac")
  : "javac";
const banner = run(javac, ["-version"]);
if (banner.error || banner.status !== 0)
  fail(`javac is unavailable: ${banner.error?.message ?? output(banner)}`);
const major = Number(/^javac (\d+)/mu.exec(output(banner))?.[1]);
if (!Number.isInteger(major) || major < 21)
  fail(
    `Ghidra 12.1 compiles bridge scripts with Java 21 or newer. Observed: ${output(banner) || "no version"}. REA does not install or upgrade Java.`,
  );

const sources = (await readdir(bridge, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".java"))
  .map((entry) => relative(root, join(bridge, entry.name)))
  .sort();
if (sources.length === 0) fail(`No Java sources found in ${bridge}.`);
const jars = (
  await readdir(join(install, "Ghidra"), {
    recursive: true,
    withFileTypes: true,
  })
)
  .filter((entry) => entry.isFile() && entry.name.endsWith(".jar"))
  .map((entry) => join(entry.parentPath, entry.name))
  .sort();
if (jars.length === 0) fail(`No jars found under ${join(install, "Ghidra")}.`);

const scratch = await mkdtemp(join(tmpdir(), "rea-ghidra-bridge-"));
try {
  // An argument file keeps the jar class path below Windows' command length.
  const argumentFile = join(scratch, "javac.args");
  await writeFile(
    argumentFile,
    [
      "-proc:none",
      "-encoding",
      "UTF-8",
      "--release",
      "21",
      "-cp",
      jars.join(process.platform === "win32" ? ";" : ":"),
      "-d",
      join(scratch, "classes"),
      ...sources,
    ]
      .map((s) => `"${s.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`)
      .join("\n"),
  );
  // Sources are repository-relative, so diagnostics name bridge/ghidra/<file>:<line>.
  const result = run(javac, ["-J-Xmx1g", `@${argumentFile}`]);
  if (result.error || result.status !== 0) {
    // Set the status instead of exiting so the scratch directory is removed.
    process.stderr.write(
      `${output(result) || result.error?.message || "javac failed"}\nGhidra ${version} could not compile the packaged bridge sources; the provider would fail at session start.\n`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify({
        ghidra_version: version,
        javac: output(banner),
        class_path_jars: jars.length,
        sources,
      }),
    );
  }
} finally {
  await rm(scratch, { recursive: true, force: true });
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 300_000,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function output(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
