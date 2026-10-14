import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { withCommands } from "./command-scope.mjs";

test("retains bounded producer diagnostics and a nonzero process outcome", async () => {
  await assert.rejects(
    withCommands((run) =>
      run(process.execPath, [
        "-e",
        "process.stderr.write('fixture refusal');process.exit(9)",
      ]),
    ),
    (error) => {
      assert.equal(error.reason, "process");
      assert.equal(error.snapshot.exitCode, 9);
      assert.equal(error.snapshot.stderr.text, "fixture refusal");
      return true;
    },
  );
});
test("refuses incomplete output instead of accepting a truncated result", async () => {
  await assert.rejects(
    withCommands((run) =>
      run(process.execPath, ["-e", "process.stdout.write('x'.repeat(8192))"], {
        maxBytes: 1024,
      }),
    ),
    (error) => error.reason === "output-limit",
  );
});
test("propagates SIGINT as cancellation without forced termination", async () => {
  const scope = await mkdtemp(join(tmpdir(), "rea-command-scope-"));
  const marker = join(scope, "child.ready");
  // The marker is written by the owned long-running child itself, so the
  // parent only signals once cancellation must interrupt an active child
  // rather than ownership preparation.
  const grandchild = `import {writeFileSync} from 'node:fs';writeFileSync(${JSON.stringify(marker)},'up');setInterval(()=>{},1000);`;
  const module = new URL("./command-scope.mjs", import.meta.url).href;
  const code = `import {withCommands} from ${JSON.stringify(module)};
try { await withCommands(async run => { await run(process.execPath,['-e',${JSON.stringify(grandchild)}]); }); }
catch (error) { process.stdout.write(error.reason+'\\n'); process.exitCode=error.reason==='cancelled'?0:1; }`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", code], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let diagnostic = "";
  child.stderr.on("data", (chunk) => {
    diagnostic += chunk;
  });
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 10_000);
  try {
    const deadline = Date.now() + 10_000;
    while (!existsSync(marker)) {
      if (Date.now() > deadline)
        throw new Error("owned child never started", { cause: output });
      await delay(50);
    }
    child.kill("SIGINT");
    const [exit] = await once(child, "close");
    assert.equal(exit, 0, output + diagnostic);
    assert.match(output, /cancelled/u);
  } finally {
    clearTimeout(timeout);
    await rm(scope, { recursive: true, force: true });
  }
});
