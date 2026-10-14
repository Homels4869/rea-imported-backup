import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { createMessage, generateKey, readPrivateKey, sign } from "openpgp";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LinuxHopperPublisher } from "../../../src/application/LinuxHopperPublisher.js";
import {
  HOPPER_LINUX_PRIMARY_FINGERPRINT,
  type LinuxHopperRelease,
} from "../../../src/application/HopperReleaseFeed.js";
import * as signatures from "../../../src/process/DetachedPgpSignature.js";
import { downloadHopperPackage } from "../../../src/application/HopperDownload.js";
import { PrivateRuntimeRoot } from "../../../src/process/PrivateRuntimeRoot.js";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";

const run = promisify(execFile);
const verifySignature = signatures.verifyDetachedPgpSignature;
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const linux = it.skipIf(process.platform !== "linux");

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Real native archives and cryptography; substitute only the test publisher identity. */
const fixture = async (family: "deb" | "arch" = "deb") => {
  const directory = await createTestTempDirectory("rea-linux-publisher-");
  const packageRoot = join(directory, "package-root");
  const launcher = join(packageRoot, "opt/hopper/bin/Hopper");
  await mkdir(join(packageRoot, "opt/hopper/bin"), { recursive: true });
  await copyFile("/usr/bin/true", launcher);
  const archive = join(directory, "archive");
  if (family === "deb") {
    await mkdir(join(packageRoot, "DEBIAN"));
    await writeFile(
      join(packageRoot, "DEBIAN/control"),
      "Package: hopper-fixture\nVersion: 1.0\nArchitecture: amd64\nMaintainer: Fixture\nDescription: Signature boundary fixture\n",
    );
    await run("dpkg-deb", ["--build", packageRoot, archive]);
  } else await run("tar", ["-cJf", archive, "-C", packageRoot, "opt"]);
  const bytes = await readFile(archive);
  const generated = await generateKey({
    type: "ecc",
    curve: "curve25519Legacy",
    userIDs: [{ name: "Fixture publisher" }],
    format: "armored",
  });
  const key = await readPrivateKey({ armoredKey: generated.privateKey });
  const signature = await sign({
    message: await createMessage({ binary: bytes }),
    signingKeys: key,
    detached: true,
    format: "binary",
  });
  const release: LinuxHopperRelease = {
    version: "1.0",
    filename: `https://www.hopperapp.com:443/downloader/public/Hopper-1.0-Linux-demo.${family === "deb" ? "deb" : "pkg.tar.xz"}`,
    file_length: String(bytes.length),
    file_hash: createHash("sha1").update(bytes).digest("hex"),
    main_exe_hash: sha256(await readFile(launcher)),
    signature: Buffer.from(signature).toString("base64"),
    public: "1",
    beta: "0",
  };
  const publisher = new LinuxHopperPublisher(
    { ...process.env, XDG_CACHE_HOME: join(directory, "cache") },
    async () => family,
  );
  const cache = join(publisher.cacheRoot, release.main_exe_hash);
  return {
    publisher,
    archive,
    launcher,
    release,
    cache,
    publicKey: generated.publicKey,
    fingerprint: key.getFingerprint().toUpperCase(),
  };
};

const admitFixturePublisher = (fingerprint: string) => {
  vi.spyOn(signatures, "verifyDetachedPgpSignature").mockImplementation(
    (bytes, signature, key, primary, signal) => {
      expect(primary).toBe(HOPPER_LINUX_PRIMARY_FINGERPRINT);
      return verifySignature(bytes, signature, key, fingerprint, signal);
    },
  );
};

describe("Linux signed package retention boundary", () => {
  linux(
    "rejects a cryptographically valid package signed by another publisher",
    async () => {
      const f = await fixture();
      try {
        expect(
          await f.publisher.verifyArchive(
            "deb",
            f.release,
            f.archive,
            undefined,
            f.publicKey,
          ),
        ).toMatchObject({
          ok: false,
          error: { reason: "publisher_verification_failed" },
        });
        await expect(access(f.publisher.cacheRoot)).rejects.toMatchObject({
          code: "ENOENT",
        });
      } finally {
        await f.publisher.close();
      }
    },
  );

  linux.each(["deb", "arch"] as const)(
    "authenticates a real %s payload and verifies a retained install without network",
    async (family) => {
      const f = await fixture(family);
      admitFixturePublisher(f.fingerprint);
      const network = vi.fn(() => {
        throw new Error("Offline");
      });
      vi.stubGlobal("fetch", network);
      try {
        const verified = await f.publisher.verifyArchive(
          family,
          f.release,
          f.archive,
          undefined,
          f.publicKey,
        );
        if (!verified.ok) throw verified.error;
        expect(
          await f.publisher.retainVerifiedArchive(verified.value, f.archive),
        ).toEqual({ ok: true, value: undefined });
        await f.publisher.close();
        const fresh = new LinuxHopperPublisher(
          f.publisher.environment,
          async () => family,
        );
        try {
          expect(await fresh.inspectLauncher(f.launcher)).toMatchObject({
            ok: true,
            value: {
              sha256: f.release.main_exe_hash,
              primaryFingerprint: f.fingerprint,
              source: "signed_package_cache",
            },
          });
          expect(network).not.toHaveBeenCalled();
        } finally {
          await fresh.close();
        }
      } finally {
        await f.publisher.close();
      }
    },
  );
});

describe("Linux signed cache tampering", () => {
  linux.each(["archive", "metadata", "missing metadata", "symlink archive"])(
    "fails closed on retained %s tampering",
    async (kind) => {
      const f = await fixture();
      admitFixturePublisher(f.fingerprint);
      try {
        const verified = await f.publisher.verifyArchive(
          "deb",
          f.release,
          f.archive,
          undefined,
          f.publicKey,
        );
        if (!verified.ok) throw verified.error;
        const retained = await f.publisher.retainVerifiedArchive(
          verified.value,
          f.archive,
        );
        if (!retained.ok) throw retained.error;
        if (kind === "archive") {
          const tampered = Buffer.from("tampered");
          await writeFile(join(f.cache, "archive"), tampered);
          const metadata = JSON.parse(
            await readFile(join(f.cache, "release.json"), "utf8"),
          );
          metadata.release.file_length = String(tampered.length);
          metadata.release.file_hash = createHash("sha1")
            .update(tampered)
            .digest("hex");
          await writeFile(
            join(f.cache, "release.json"),
            JSON.stringify(metadata),
          );
        }
        if (kind === "metadata") {
          const metadata = JSON.parse(
            await readFile(join(f.cache, "release.json"), "utf8"),
          );
          metadata.release.main_exe_hash = "a".repeat(64);
          await writeFile(
            join(f.cache, "release.json"),
            JSON.stringify(metadata),
          );
        }
        if (kind === "missing metadata")
          await rm(join(f.cache, "release.json"));
        if (kind === "symlink archive") {
          await rm(join(f.cache, "archive"));
          await symlink(f.archive, join(f.cache, "archive"));
        }
        const network = vi.fn(() => {
          throw new Error("Must preserve the cache failure");
        });
        vi.stubGlobal("fetch", network);
        expect(await f.publisher.inspectLauncher(f.launcher)).toMatchObject({
          ok: false,
        });
        expect(network).not.toHaveBeenCalled();
      } finally {
        await f.publisher.close();
      }
    },
  );

  linux(
    "rejects a feed digest not represented in the signed payload",
    async () => {
      const f = await fixture();
      admitFixturePublisher(f.fingerprint);
      try {
        expect(
          await f.publisher.verifyArchive(
            "deb",
            { ...f.release, main_exe_hash: "a".repeat(64) },
            f.archive,
            undefined,
            f.publicKey,
          ),
        ).toMatchObject({
          ok: false,
          error: {
            reason: "integrity",
            message: expect.stringContaining(f.release.main_exe_hash),
          },
        });
        expect(
          await f.publisher.verifyArchive(
            "deb",
            f.release,
            f.archive,
            AbortSignal.abort(),
            f.publicKey,
          ),
        ).toMatchObject({ ok: false, error: { reason: "cancelled" } });
      } finally {
        await f.publisher.close();
      }
    },
  );
});

describe("Hopper verification capacity and ownership", () => {
  it("cancels an oversized chunked metadata response before retaining it", async () => {
    const cancelled = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(4));
              },
              cancel: cancelled,
            }),
          ),
      ),
    );
    expect(
      await downloadHopperPackage("https://www.hopperapp.com/fixture", {
        maxBytes: 3,
      }),
    ).toEqual({ ok: false, bytes: new Uint8Array() });
    expect(cancelled).toHaveBeenCalledOnce();
  });

  linux("retains and retries failed verification cleanup", async () => {
    const f = await fixture();
    admitFixturePublisher(f.fingerprint);
    const cleanup = vi
      .spyOn(PrivateRuntimeRoot.prototype, "close")
      .mockRejectedValueOnce(new Error("Fixture cleanup unavailable"));
    try {
      expect(
        await f.publisher.verifyArchive(
          "deb",
          f.release,
          f.archive,
          undefined,
          f.publicKey,
        ),
      ).toMatchObject({ ok: false, error: { reason: "cleanup_failed" } });
      expect(cleanup).toHaveBeenCalledOnce();
      await f.publisher.close();
      expect(cleanup).toHaveBeenCalledTimes(2);
    } finally {
      await f.publisher.close();
    }
  });
});
