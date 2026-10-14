import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { PeResourcesService } from "./PeResourcesService.js";
import { PE_RESOURCES_PROVIDER } from "../InvestigationProviders.js";
import { inspectPeResourcesInputSchema } from "../../domain/native/peResources.js";
import { parsePeResources } from "../../native/pe/PeResourceParser.js";
import { peResourceFixture } from "../../native/pe/PeResources.fixture.js";
import { ok } from "../../domain/result.js";

const observedReport = () => {
  const { bytes } = peResourceFixture();
  return parsePeResources(
    bytes,
    {
      path: "/fixtures/example.exe",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
    inspectPeResourcesInputSchema.parse({ path: "/fixtures/example.exe" }),
  );
};

it.each([
  "different-path",
  "outside-range",
  "wrong-coverage",
  "bad-icon-reference",
  "bad-string-location",
  "bad-version-location",
])(
  "rejects invalid provider output before creating Evidence: %s",
  async (problem) => {
    const report = await observedReport();
    if (problem === "different-path") report.artifact.path = "/other.exe";
    if (problem === "outside-range")
      report.resources[0]!.payload.location.offset = report.artifact.bytes;
    if (problem === "wrong-coverage") report.coverage.resources = 99;
    if (problem === "bad-icon-reference")
      report.icon_groups[0]!.images[0]!.candidate_resource_indices = [999];
    if (problem === "bad-string-location") {
      report.resources.push({
        ...report.resources[0]!,
        index: report.resources.length,
        type: { kind: "id", id: 6 },
      });
      report.coverage.resources = report.resources.length;
      report.string_tables.push({
        resource_index: report.resources.length - 1,
        status: "decoded",
        block_id: 1,
        first_string_id: 0,
        strings: [],
        trailing_bytes: 0,
        reason: null,
      });
    }
    if (problem === "bad-version-location") {
      report.resources.push({
        ...report.resources[0]!,
        index: report.resources.length,
        type: { kind: "id", id: 16 },
      });
      report.coverage.resources = report.resources.length;
      report.version_infos.push({
        resource_index: report.resources.length,
        status: "malformed",
        fixed_file_info: null,
        string_file_info: [],
        translations: [],
        reason: "malformed",
      });
    }
    const service = new PeResourcesService({
      identity: PE_RESOURCES_PROVIDER,
      inspect: () => Promise.resolve(ok(report)),
    });
    expect(
      await service.inspect({ path: "/fixtures/example.exe" }),
    ).toMatchObject({ ok: false, error: { _tag: "AnalysisOutputError" } });
  },
);

it("discards an observation if the caller cancels while the provider completes", async () => {
  const report = await observedReport();
  const controller = new AbortController();
  const service = new PeResourcesService({
    identity: PE_RESOURCES_PROVIDER,
    inspect: () => {
      controller.abort();
      return Promise.resolve(ok(report));
    },
  });
  expect(
    await service.inspect(
      { path: report.artifact.path },
      { signal: controller.signal },
    ),
  ).toMatchObject({ ok: false, error: { _tag: "AnalysisCancelledError" } });
});
