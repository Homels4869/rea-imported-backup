import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, it } from "vitest";

import { systemLinuxHopperInstallHost } from "../../../src/application/LinuxHopper.js";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";

it("reports a supported installed launcher without a linker probe", async () => {
  const root = await createTestTempDirectory("rea-hopper-supported-launcher-");
  const launcher = join(root, "Hopper");
  await writeFile(launcher, "test launcher fixture");

  const host = systemLinuxHopperInstallHost({}, async () => true);

  await expect(host.launcherStatus(launcher)).resolves.toBe("ready");
});

it("rejects an installed launcher whose digest is not supported", async () => {
  const root = await createTestTempDirectory("rea-hopper-unverified-launcher-");
  const launcher = join(root, "Hopper");
  await writeFile(launcher, "untrusted launcher fixture");

  const host = systemLinuxHopperInstallHost({});

  await expect(host.launcherStatus(launcher)).resolves.toBe(
    "unsupported_hopper_build",
  );
});
