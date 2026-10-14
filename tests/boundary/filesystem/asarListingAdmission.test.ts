import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buffer } from "node:stream/consumers";
import { setImmediate } from "node:timers/promises";
import { createPackage, listPackage } from "@electron/asar";
import { expect, it } from "vitest";

import { AsarArtifactReader } from "../../../src/artifacts/AsarArtifactReader.js";
import { readAsarListing } from "../../../src/artifacts/AsarListing.js";
import {
  asarHeaderBytes,
  nestedAsarHeader,
} from "../../fixtures/asarHeader.js";
import { inventoryArtifact } from "../../fixtures/artifactInventory.js";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";

/** Prepend JSON whitespace to an official ASAR header while keeping member bytes. */
const withLeadingHeaderWhitespace = (
  archive: Buffer,
  whitespace: string,
): Buffer => {
  const headerSize = archive.readUInt32LE(4);
  const stringLength = archive.readUInt32LE(12);
  const json = archive.subarray(16, 16 + stringLength);
  const nextJson = Buffer.concat([Buffer.from(whitespace), json]);
  const nextHeaderSize = 8 + Math.ceil(nextJson.length / 4) * 4;
  const next = Buffer.alloc(archive.length - headerSize + nextHeaderSize);
  next.writeUInt32LE(4, 0);
  next.writeUInt32LE(nextHeaderSize, 4);
  next.writeUInt32LE(nextHeaderSize - 4, 8);
  next.writeUInt32LE(nextJson.length, 12);
  nextJson.copy(next, 16);
  archive.subarray(8 + headerSize).copy(next, 8 + nextHeaderSize);
  return next;
};

const archiveWith = async (bytes: Buffer) => {
  const root = await createTestTempDirectory("rea-asar-listing-");
  const path = join(root, "app.asar");
  await writeFile(path, bytes);
  return path;
};

it("interrupts expanded listing admission between traversal batches", async () => {
  const controller = new AbortController();
  const header = {
    files: Object.fromEntries(
      Array.from({ length: 4000 }, (_, index) => [
        `f${index}`,
        { size: 0, offset: "0" },
      ]),
    ),
  };
  const listing = readAsarListing(header, controller.signal);
  await setImmediate();
  controller.abort();
  await expect(listing).rejects.toMatchObject({ reason: "cancelled" });
});

it("rejects path expansion before publishing any inventory, preserving the input", async () => {
  const bytes = nestedAsarHeader(64, "d".repeat(256), 4000);
  expect(bytes.length).toBeLessThan(150_000);
  const path = await archiveWith(bytes);
  await expect(inventoryArtifact(path)).rejects.toMatchObject({
    reason: "limit",
    message: "ASAR expanded listing exceeds its 64 MiB representation budget",
  });
  expect(await readFile(path)).toEqual(bytes);
});

it("reads deeply nested packed metadata without recursive listing or member lookup", async () => {
  const path = await archiveWith(nestedAsarHeader(3500, "d", 1));
  const reader = new AsarArtifactReader(path);
  try {
    let count = 0;
    for await (const entry of reader.entries()) {
      count++;
      if (entry.kind === "file") {
        expect(entry.path).toBe(`${"d/".repeat(3500)}f0`);
        expect(await buffer(await reader.open(entry))).toEqual(Buffer.alloc(0));
      }
    }
    expect(count).toBe(3501);
  } finally {
    await reader.close();
  }
});

it.each(["..", ".", "", "a/../b", "a/b", "a\0b"])(
  "rejects raw ASAR component %j before host normalization can alias another entry",
  async (component) => {
    const json = JSON.stringify({
      files: { [component]: { size: 0, offset: "0" } },
    });
    await expect(
      inventoryArtifact(await archiveWith(asarHeaderBytes(json))),
    ).rejects.toMatchObject({ reason: "path" });
  },
);

it("orders raw names portably and retains prototype-named entries and links", async () => {
  const path = await archiveWith(
    asarHeaderBytes(
      '{"files":{"a0":{"size":0,"offset":"0"},"__proto__":{"size":0,"offset":"0"},"a":{"files":{"b":{"link":"a0"}}},"😀":{"size":0,"offset":"0"},"\uE000":{"size":0,"offset":"0"}}}',
    ),
  );
  const reader = new AsarArtifactReader(path);
  try {
    const entries = [];
    for await (const entry of reader.entries())
      entries.push([entry.path, entry.kind]);
    expect(entries).toEqual([
      ["__proto__", "file"],
      ["a", "directory"],
      ["a/b", "symlink"],
      ["a0", "file"],
      ["\uE000", "file"],
      ["😀", "file"],
    ]);
  } finally {
    await reader.close();
  }
});

it("preserves POSIX literal backslashes and rejects Windows component separators", async () => {
  const path = await archiveWith(
    asarHeaderBytes(
      JSON.stringify({ files: { "a\\b": { size: 0, offset: "0" } } }),
    ),
  );
  const reader = new AsarArtifactReader(path);
  try {
    const list = async () => {
      const entries = [];
      for await (const entry of reader.entries()) entries.push(entry);
      return entries;
    };
    if (process.platform === "win32") {
      await expect(list()).rejects.toMatchObject({ reason: "path" });
    } else {
      const entries = await list();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.path).toBe("a\\b");
      expect(await buffer(await reader.open(entries[0]!))).toEqual(
        Buffer.alloc(0),
      );
    }
  } finally {
    await reader.close();
  }
});

it.each([" ", "\n"] as const)(
  "keeps official ASAR member inventory when the JSON header starts with %j",
  async (whitespace) => {
    const root = await createTestTempDirectory("rea-asar-json-ws-");
    const source = join(root, "source");
    const archive = join(root, "app.asar");
    await mkdir(source);
    await writeFile(join(source, "main.js"), "export const answer = 42;\n");
    await writeFile(join(source, "package.json"), '{"name":"fixture"}\n');
    await createPackage(source, archive);
    const rewritten = withLeadingHeaderWhitespace(
      await readFile(archive),
      whitespace,
    );
    await writeFile(archive, rewritten);
    expect(listPackage(archive, { isPack: false }).sort()).toEqual([
      "/main.js",
      "/package.json",
    ]);

    const inventory = await inventoryArtifact(archive);
    expect(inventory.manifest.root_format).toBe("asar");
    expect(
      inventory.occurrences.map((occurrence) => occurrence.logical_path).sort(),
    ).toEqual([".", "main.js", "package.json"]);
  },
);
