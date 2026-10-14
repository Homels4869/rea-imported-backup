import { describe, expect, it } from "vitest";

import { functionDossierSchema } from "../../domain/hopperValues.js";
import { ghidraFunctionDossier } from "../../domain/ghidraValues.fixture.js";
import { nativeApiBoundarySchema } from "../../domain/native/nativeApiBoundary.js";
import { projectNativeApiInspection } from "./NativeApiInspection.js";
import { createWorkflowEvidence } from "../WorkflowEvidence.js";
import { jsonValueSchema } from "../../domain/jsonValue.js";

it.each([
  "ghidra-decompiler-warning-observations",
  "independent-warning-producer",
])("keeps %s warnings inline and in API workflow Evidence", (provenance) => {
  const base = functionDossierSchema.parse(ghidraFunctionDossier());
  const dossier = functionDossierSchema.parse({
    ...base,
    decompiler_completeness: {
      ...base.decompiler_completeness,
      provenance,
      status: "warnings",
      warning_count: 1,
      warnings: ["Removing unreachable block (ram,0x401020)"],
      diagnostic: "Incomplete type recovery",
    },
  });
  const result = projectNativeApiInspection(dossier);
  expect(result.boundary).toEqual(dossier.native_api);
  expect(result.residual_unknowns).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Removing unreachable block"),
      expect.stringContaining("Incomplete type recovery"),
    ]),
  );
  const evidence = createWorkflowEvidence({
    target: undefined,
    operation: "inspect_native_api",
    parameters: { procedure: dossier.procedure.address },
    result: jsonValueSchema.parse(result),
    upstreamProfile: undefined,
    upstreamLimitations: [],
  });
  expect(evidence.limitations).toEqual(
    expect.arrayContaining([
      "Decompiler warning: Removing unreachable block (ram,0x401020)",
      "Decompiler diagnostic: Incomplete type recovery",
    ]),
  );
});

describe("native API switch uncertainty", () => {
  it("reports an unevidenced default path independently of known numeric cases", () => {
    const dossier = functionDossierSchema.parse(ghidraFunctionDossier());
    const boundary = dossier.native_api;
    if (boundary?.available !== true)
      throw new TypeError("Ghidra native API fixture is unavailable");
    const table = boundary.jump_tables[0];
    if (table === undefined)
      throw new TypeError("Ghidra jump-table fixture is unavailable");
    const incomplete = functionDossierSchema.parse({
      ...dossier,
      native_api: {
        ...boundary,
        jump_tables: [{ ...table, default_targets: [] }],
      },
    });
    expect(projectNativeApiInspection(incomplete).residual_unknowns).toContain(
      "Which default or out-of-range path, if any, belongs to the dispatch at 0x401010?",
    );
  });

  it("does not report evidenced defaults as unknown cases and retains genuinely unresolved mappings", () => {
    const dossier = functionDossierSchema.parse(ghidraFunctionDossier());
    const boundary = dossier.native_api;
    if (boundary?.available !== true)
      throw new TypeError("Ghidra native API fixture is unavailable");
    const table = boundary.jump_tables[0];
    const mapping = table?.mappings[0];
    if (table === undefined || mapping === undefined)
      throw new TypeError("Ghidra jump-table fixture is unavailable");
    const defaultTarget = {
      target_address: mapping.target_address,
      confidence: "high",
      evidence: mapping.evidence,
    };
    const complete = functionDossierSchema.parse({
      ...dossier,
      native_api: {
        ...boundary,
        jump_tables: [{ ...table, default_targets: [defaultTarget] }],
      },
    });
    expect(projectNativeApiInspection(complete).residual_unknowns).toEqual([]);
    const unresolved = functionDossierSchema.parse({
      ...complete,
      native_api: {
        ...boundary,
        jump_tables: [
          {
            ...table,
            default_targets: [defaultTarget],
            mappings: [
              mapping,
              { ...mapping, case_value: null, target_address: "0x401030" },
            ],
          },
        ],
      },
    });
    expect(projectNativeApiInspection(unresolved).residual_unknowns).toContain(
      "Which source-level case values correspond to every target dispatched at 0x401010?",
    );
  });
});

describe("native API inspection", () => {
  it("preserves unsupported provider branches as residual unknowns", () => {
    const value = ghidraFunctionDossier();
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new TypeError("Ghidra dossier fixture is invalid");
    const dossier = functionDossierSchema.parse({ ...value, native_api: null });

    expect(projectNativeApiInspection(dossier)).toMatchObject({
      boundary: { available: false },
      unsupported_branches: [
        "structured-boundary-types",
        "jump-table-data-mapping",
      ],
      residual_unknowns: [
        expect.stringContaining("boundary types"),
        expect.stringContaining("jump table"),
      ],
    });
  });

  it("reports missing jump-table targets as an explicit unknown", () => {
    const value = ghidraFunctionDossier();
    const dossier = functionDossierSchema.parse(value);
    const boundary = dossier.native_api;
    if (boundary?.available !== true)
      throw new TypeError("Ghidra native API fixture is unavailable");
    const table = boundary.jump_tables[0];
    if (table === undefined)
      throw new TypeError("Ghidra jump-table fixture is unavailable");

    const incomplete = functionDossierSchema.parse({
      ...dossier,
      native_api: {
        ...boundary,
        jump_tables: [{ ...table, mappings: [] }],
      },
    });
    expect(projectNativeApiInspection(incomplete).residual_unknowns).toContain(
      "Which case values and targets belong to the dispatch at 0x401010?",
    );
  });

  it("rejects boundary types placed in the wrong ABI role", () => {
    const boundary = functionDossierSchema.parse(
      ghidraFunctionDossier(),
    ).native_api;
    if (boundary === null || boundary.available !== true)
      throw new TypeError("Ghidra native API fixture is unavailable");

    expect(
      nativeApiBoundarySchema.safeParse({
        ...boundary,
        return_type: { ...boundary.return_type, role: "parameter" },
      }).success,
    ).toBe(false);
    expect(
      nativeApiBoundarySchema.safeParse({
        ...boundary,
        parameters: [
          {
            ...boundary.return_type,
            role: "return",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
