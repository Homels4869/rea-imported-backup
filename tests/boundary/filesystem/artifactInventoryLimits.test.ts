import { stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { TextReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { expect, it } from "vitest";

import { inventoryArtifact } from "../../fixtures/artifactInventory.js";
import { writeOrderedZip } from "../../fixtures/artifactEntryOrder.js";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";
import { ZipArtifactReader } from "../../../src/artifacts/ZipArtifactReader.js";
import {
  ZIP_MAX_ENTRIES_PER_TRAVERSAL,
  ZIP_METADATA_READ_MAX_BYTES,
} from "../../../src/domain/zipArtifactBudget.js";

it("rejects ZIP inventories beyond the bounded entry count", async () => {
  const root = await createTestTempDirectory("rea-zip-entry-limit-");
  const archive = join(root, "many-directories.zip");
  const entryCount = ZIP_MAX_ENTRIES_PER_TRAVERSAL + 1;
  const entries = Array.from(
    { length: entryCount },
    (_unused, index) => `d${index.toString(36)}/`,
  );
  await writeOrderedZip(archive, entries);

  await expect(inventoryArtifact(archive)).rejects.toMatchObject({
    name: "ArtifactReaderFailure",
    reason: "limit",
    message: expect.stringContaining(
      `${ZIP_MAX_ENTRIES_PER_TRAVERSAL}-entry limit`,
    ),
  });
});

it("bounds direct ZIP readers as well as inventory graph construction", async () => {
  const root = await createTestTempDirectory("rea-zip-reader-entry-limit-");
  const archive = join(root, "many-directories.zip");
  const entries = Array.from(
    { length: ZIP_MAX_ENTRIES_PER_TRAVERSAL + 1 },
    (_unused, index) => `d${index.toString(36)}/`,
  );
  await writeOrderedZip(archive, entries);

  const reader = new ZipArtifactReader(archive, "zip");
  let entriesRead = 0;
  try {
    await expect(
      (async () => {
        for await (const entry of reader.entries()) {
          expect(entry.path).not.toBe("");
          entriesRead += 1;
        }
      })(),
    ).rejects.toMatchObject({
      name: "ArtifactReaderFailure",
      reason: "limit",
      message: expect.stringContaining(
        `${ZIP_MAX_ENTRIES_PER_TRAVERSAL}-entry limit`,
      ),
    });
    expect(entriesRead).toBe(0);
  } finally {
    await reader.close();
  }
});

it("rejects a ZIP central directory larger than the metadata read budget", async () => {
  const root = await createTestTempDirectory("rea-zip-metadata-limit-");
  const archive = join(root, "large-central-directory.zip");
  const writer = new ZipWriter(new Uint8ArrayWriter());
  const comment = "c".repeat(65_000);
  for (let index = 0; index < 129; index += 1)
    await writer.add(`entry-${index}.txt`, new TextReader("x"), { comment });
  await writeFile(archive, await writer.close());
  expect((await stat(archive)).size).toBeGreaterThan(
    ZIP_METADATA_READ_MAX_BYTES,
  );

  await expect(inventoryArtifact(archive)).rejects.toMatchObject({
    name: "ArtifactReaderFailure",
    reason: "limit",
    message: expect.stringContaining(
      `${ZIP_METADATA_READ_MAX_BYTES}-byte read budget`,
    ),
  });
});
