import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);

// The stand-in javac is a POSIX shell script; CI runs this on Linux.
it.skipIf(process.platform === "win32").each([
  { outcome: "fails", status: 1 },
  { outcome: "passes", status: 0 },
])(
  "removes its scratch directory when compilation $outcome",
  async ({ status }) => {
    const root = await mkdtemp(join(tmpdir(), "rea-ghidra-bridge-test-"));
    try {
      const install = join(root, "ghidra");
      await mkdir(join(install, "Ghidra/Framework/lib"), { recursive: true });
      await writeFile(
        join(install, "Ghidra/application.properties"),
        "application.version=12.1.4\n",
      );
      await writeFile(join(install, "Ghidra/Framework/lib/Generic.jar"), "");
      const javaHome = join(root, "jdk");
      await mkdir(join(javaHome, "bin"), { recursive: true });
      const javac = join(javaHome, "bin/javac");
      await writeFile(
        javac,
        [
          "#!/bin/sh",
          'if [ "$1" = "-version" ]; then echo "javac 21.0.12"; exit 0; fi',
          ...(status === 0
            ? ["exit 0"]
            : [
                'echo "bridge/ghidra/ReaGhidraBridge.java:1: error: cannot find symbol" >&2',
                "exit 1",
              ]),
        ].join("\n"),
      );
      await chmod(javac, 0o755);
      // The verifier creates its scratch directory under this owned TMPDIR.
      const scratchParent = join(root, "tmp");
      await mkdir(scratchParent);
      const run = execute(
        process.execPath,
        ["scripts/verify-ghidra-bridge-sources.mjs"],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            GHIDRA_INSTALL_DIR: install,
            JAVA_HOME: javaHome,
            TMPDIR: scratchParent,
          },
          timeout: 30_000,
        },
      );
      if (status === 0)
        await expect(run).resolves.toMatchObject({
          stdout: expect.stringContaining('"ghidra_version":"12.1.4"'),
        });
      else
        await expect(run).rejects.toMatchObject({
          code: 1,
          stdout: "",
          stderr: expect.stringContaining(
            "bridge/ghidra/ReaGhidraBridge.java:1: error: cannot find symbol",
          ),
        });
      expect(await readdir(scratchParent)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
