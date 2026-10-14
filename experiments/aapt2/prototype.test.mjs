import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { withCommands } from "../command-scope.mjs";

const script = fileURLToPath(new URL("./verify.mjs", import.meta.url));
test("refuses an occupied output directory without overwriting its contents", async () => {
  const root = await mkdtemp(join(tmpdir(), "rea-aapt2-collision-"));
  const marker = join(root, "preserve.txt");
  await writeFile(marker, "caller evidence");
  try {
    await assert.rejects(
      withCommands((run) =>
        run(process.execPath, [
          script,
          "--aapt2",
          "missing-aapt2",
          "--apktool",
          "missing-apktool",
          "--framework",
          "missing.jar",
          "--output",
          root,
        ]),
      ),
      (error) =>
        error.reason === "process" &&
        error.snapshot.stderr.text.includes("EEXIST"),
    );
    assert.equal(await readFile(marker, "utf8"), "caller evidence");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("retains command failure diagnostics and rejects output truncation", async () => {
  await assert.rejects(
    withCommands((run) =>
      run(process.execPath, [
        "-e",
        "process.stderr.write('fixture refused');process.exit(9)",
      ]),
    ),
    (error) =>
      error.reason === "process" &&
      error.snapshot.exitCode === 9 &&
      error.snapshot.stderr.text === "fixture refused",
  );
  await assert.rejects(
    withCommands((run) =>
      run(process.execPath, ["-e", "process.stdout.write('x'.repeat(8192))"], {
        maxBytes: 1024,
      }),
    ),
    (error) => error.reason === "output-limit",
  );
});
const framework = process.env.REA_AAPT2_PROBE_FRAMEWORK;
const aapt2 = process.env.REA_AAPT2_PROBE_COMMAND;
const apktool = process.env.REA_APKTOOL_COMMAND;
test(
  "real AAPT2 inspection, compile/link and Apktool rebuild preserve input identity",
  {
    skip:
      framework === undefined || aapt2 === undefined || apktool === undefined
        ? "Set REA_AAPT2_PROBE_FRAMEWORK, REA_AAPT2_PROBE_COMMAND and REA_APKTOOL_COMMAND for the real lane"
        : false,
    timeout: 300_000,
  },
  async () => {
    const root = await mkdtemp(join(tmpdir(), "rea-aapt2-real-"));
    try {
      const output = join(root, "result");
      const result = await withCommands((run) =>
        run(
          process.execPath,
          [
            script,
            "--aapt2",
            aapt2,
            "--apktool",
            apktool,
            "--framework",
            framework,
            "--output",
            output,
          ],
          { timeoutMs: 240_000 },
        ),
      );
      assert.match(result.stdout, /prototype:.*passed/u);
      const receipt = JSON.parse(
        await readFile(join(output, "receipt.json"), "utf8"),
      );
      assert.equal(receipt.existing_decode_cli_mcp_parity, true);
      assert.equal(receipt.malformed_resource_refused, true);
      assert.equal(receipt.missing_framework_refused, true);
      assert.match(receipt.rebuilt.sha256, /^[a-f0-9]{64}$/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
