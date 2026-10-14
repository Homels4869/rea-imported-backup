import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect } from "vitest";

import { createEvidence } from "../../../src/domain/evidence.js";
import {
  createEvidenceBundle,
  serializeEvidenceBundle,
} from "../../../src/domain/evidenceBundle.js";
import {
  createResidualUnknown,
  updateResidualUnknown,
} from "../../../src/domain/residualUnknown.js";
import { createTestTempDirectory } from "../../fixtures/temporaryDirectory.js";
import { cliTest } from "../../support/cli/cliFixture.js";

const revisionBundle = () => {
  const records = ["open", "investigate"].map((operation) =>
    createEvidence(
      undefined,
      { id: "fixture", name: "Fixture", version: "1" },
      { operation, parameters: {}, result: { observed: operation } },
    ),
  );
  const [opened, investigated] = records;
  if (opened === undefined || investigated === undefined)
    throw new Error("Missing mutation Evidence");
  const details = {
    severity: "high" as const,
    supporting_evidence_ids: [],
    contradicting_evidence_ids: [],
    required_authority: null,
    required_confidence: "observed" as const,
    required_environment: null,
    recommended_probes: [],
    relationships: [],
  };
  const initial = createResidualUnknown(
    { question: "How is this input handled?", domain: "protocol", ...details },
    opened.evidence_id,
    null,
  );
  const revised = updateResidualUnknown(
    initial,
    {
      unknown_id: initial.unknown_id,
      expected_revision: initial.revision,
      status: "investigating",
      ...details,
      resolution: null,
    },
    investigated.evidence_id,
  );
  return createEvidenceBundle(records, [initial, revised]);
};

cliTest.skipIf(process.platform === "win32")(
  "preserves filesystem-selected bundle paths through import and atomic export",
  async ({ cli }) => {
    const root = await createTestTempDirectory("rea-evidence-selected-path-");
    await mkdir(join(root, "actual", "child"), { recursive: true });
    await symlink("actual/child", join(root, "alias"));
    const value = revisionBundle();
    const encoded = serializeEvidenceBundle(value);
    await writeFile(join(root, "actual", "source.json"), encoded);
    await writeFile(join(root, "source.json"), "unselected source");
    await writeFile(join(root, "actual", "output.json"), "selected output");
    await writeFile(join(root, "output.json"), "unselected output");
    const selectedSource = `${root}/alias/../source.json`;
    expect(await readFile(selectedSource, "utf8")).toBe(encoded);
    for (const source of [selectedSource, "alias/../source.json"]) {
      const imported = await cli.run({
        arguments: ["evidence-import", source, "--json"],
        cwd: root,
      });
      expect(imported.exitCode).toBe(0);
      expect(imported.json).toEqual({
        imported: 2,
        unknowns_added: 2,
        total: 2,
      });
    }
    const selectedOutput = `${root}/alias/../output.json`;
    const existing = await cli.run({
      arguments: ["evidence-export", selectedSource, selectedOutput, "--json"],
      cwd: root,
    });
    expect(existing.exitCode).toBe(1);
    expect(existing.json).toMatchObject({
      details: { reason: "exists", path: selectedOutput },
    });
    expect(await readFile(join(root, "actual", "output.json"), "utf8")).toBe(
      "selected output",
    );
    for (const output of [selectedOutput, "alias/../output.json"]) {
      const exported = await cli.run({
        arguments: [
          "evidence-export",
          "actual/source.json",
          output,
          "--overwrite",
          "--json",
        ],
        cwd: root,
      });
      expect(exported.exitCode).toBe(0);
      expect(exported.json).toMatchObject({ path: selectedOutput, records: 2 });
      expect(await readFile(join(root, "actual", "output.json"), "utf8")).toBe(
        encoded,
      );
      expect(await readFile(join(root, "output.json"), "utf8")).toBe(
        "unselected output",
      );
    }
    const created = await cli.run({
      arguments: [
        "evidence-export",
        selectedSource,
        "alias/../new.json",
        "--json",
      ],
      cwd: root,
    });
    expect(created.exitCode).toBe(0);
    expect(await readFile(join(root, "actual", "new.json"), "utf8")).toBe(
      encoded,
    );
    await expect(readFile(join(root, "new.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });

    const recordPath = `${root}/alias/../record.json`;
    await writeFile(recordPath, JSON.stringify(value.records[0]));
    const wrongKind = await cli.run({
      arguments: ["evidence-import", recordPath, "--json"],
    });
    expect(wrongKind.exitCode).toBe(1);
    expect(wrongKind.json).toMatchObject({
      details: { reason: "wrong-kind", path: recordPath },
    });
  },
);

cliTest(
  "reports standalone import counts for every unknown revision",
  async ({ cli }) => {
    const root = await createTestTempDirectory("rea-evidence-import-");
    const path = join(root, "bundle.json");
    await writeFile(path, JSON.stringify(revisionBundle()));
    const result = await cli.run({
      arguments: ["evidence-import", path, "--json"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({ imported: 2, unknowns_added: 2, total: 2 });
  },
);

cliTest(
  "reports a standalone Evidence record as the wrong input file kind",
  async ({ cli }) => {
    const root = await createTestTempDirectory("rea-evidence-record-input-");
    const path = join(root, "record.json");
    const record = revisionBundle().records[0];
    if (record === undefined) throw new Error("Missing fixture Evidence");
    await writeFile(path, JSON.stringify(record));
    const result = await cli.run({
      arguments: ["evidence-import", path, "--json"],
    });
    expect(result.exitCode).toBe(1);
    expect(result.json).toMatchObject({
      code: "invalid_request",
      category: "invalid_input",
      details: { path },
      message: expect.stringContaining("this JSON is one Evidence record"),
    });
  },
);

cliTest(
  "rejects altered Evidence and incomplete unknown history before reporting counts",
  async ({ cli }) => {
    const root = await createTestTempDirectory("rea-evidence-import-invalid-");
    const path = join(root, "bundle.json");
    const bundle = revisionBundle();
    for (const invalid of [
      {
        ...bundle,
        records: bundle.records.map((record) => ({
          ...record,
          normalized_result: "altered",
        })),
      },
      { ...bundle, unknowns: bundle.unknowns.slice(1) },
    ]) {
      await writeFile(path, JSON.stringify(invalid));
      const result = await cli.run({
        arguments: ["evidence-import", path, "--json"],
      });
      expect(result.exitCode).toBe(1);
      expect(result.json).toMatchObject({
        code: "evidence_integrity_mismatch",
      });
      expect(result.json).not.toHaveProperty("imported");
    }
  },
);
