import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
const execute = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), "rea-warning-producer-"));
const java = process.env.JAVA_HOME
  ? join(process.env.JAVA_HOME, "bin", "java")
  : "java";
const javac = process.env.JAVA_HOME
  ? join(process.env.JAVA_HOME, "bin", "javac")
  : "javac";
try {
  await execute(
    javac,
    [
      "--release",
      "17",
      "-d",
      root,
      fileURLToPath(
        new URL(
          "../bridge/ghidra/ReaGhidraDecompilerWarnings.java",
          import.meta.url,
        ),
      ),
      fileURLToPath(
        new URL(
          "../tests/conformance/ghidra/ReaGhidraDecompilerWarningsTest.java",
          import.meta.url,
        ),
      ),
    ],
    { timeout: 30_000 },
  );
  const result = await execute(
    java,
    ["-cp", root, "ReaGhidraDecompilerWarningsTest"],
    { timeout: 30_000 },
  );
  process.stdout.write(result.stdout);
} finally {
  await rm(root, { recursive: true, force: true });
}
