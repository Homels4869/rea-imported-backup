import { expect, it } from "vitest";

import { analyzeJavaScriptStaticSource } from "../../domain/javascript/javascriptStaticAnalysis.js";
import { javaScriptWorkerStaticAnalysisSchema } from "./JavaScriptAnalysisWorkerSchemas.js";

it.each([
  {
    description: "nonempty endpoint values",
    source: 'client.get("settingKey"); fetch("/api");',
    candidateValue: "settingKey",
    candidateMechanism: "call:client.get",
    knownValue: "/api",
  },
  {
    description: "empty endpoint values",
    source: "app.get(''); fetch('');",
    candidateValue: "",
    candidateMechanism: "call:app.get",
    knownValue: "",
  },
])(
  "retains candidate interpretation for $description across the worker boundary",
  ({ source, candidateValue, candidateMechanism, knownValue }) => {
    const facts = analyzeJavaScriptStaticSource(source);
    expect(facts.endpoints).toEqual([
      expect.objectContaining({
        kind: "network",
        value: candidateValue,
        mechanism: candidateMechanism,
        interpretation: "candidate",
      }),
      expect.objectContaining({ value: knownValue }),
    ]);
    expect(facts.endpoints[1]).not.toHaveProperty("interpretation");
    const serialized = JSON.parse(JSON.stringify(facts)) as unknown;
    expect(javaScriptWorkerStaticAnalysisSchema.parse(serialized)).toEqual(
      facts,
    );
    for (const interpretation of ["verified", "confirmed"]) {
      expect(
        javaScriptWorkerStaticAnalysisSchema.safeParse({
          ...facts,
          endpoints: facts.endpoints.map((endpoint) => ({
            ...endpoint,
            interpretation,
          })),
        }).success,
      ).toBe(false);
    }
  },
);

it("versions fingerprints through the worker schema and rejects v1", () => {
  const facts =
    analyzeJavaScriptStaticSource(`globalThis.webpackChunkApp.push([[1], {
    17(module, exports) { const key = selectKey(); exports.read = value[key]; }
  }]);`);
  expect(facts.bundler_registrations[0]?.modules[0]).toMatchObject({
    structural_fingerprint_algorithm: "babel-ast-v2",
    structural_fingerprint_sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
  });
  expect(
    javaScriptWorkerStaticAnalysisSchema.safeParse(
      JSON.parse(JSON.stringify(facts)) as unknown,
    ).success,
  ).toBe(true);
  const old = {
    ...facts,
    bundler_registrations: facts.bundler_registrations.map((registration) => ({
      ...registration,
      modules: registration.modules.map((module) => ({
        ...module,
        structural_fingerprint_algorithm: "babel-ast-v1",
      })),
    })),
  };
  expect(javaScriptWorkerStaticAnalysisSchema.safeParse(old).success).toBe(
    false,
  );
});

it("accepts candidate endpoint interpretations from static analysis", () => {
  const facts = analyzeJavaScriptStaticSource(`http.request("POST", target);`);
  expect(facts.endpoints).toContainEqual(
    expect.objectContaining({
      kind: "network",
      value: "POST",
      interpretation: "candidate",
    }),
  );
  expect(
    javaScriptWorkerStaticAnalysisSchema.safeParse(
      JSON.parse(JSON.stringify(facts)) as unknown,
    ).success,
  ).toBe(true);
});
