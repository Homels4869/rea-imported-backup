import { expect, it } from "vitest";

import { CdpBrowserProvider } from "../../../src/browser/CdpBrowserProvider.js";
import { inspectWebPageInputSchema } from "../../../src/domain/browserObservation.js";
import { startFakeCdpBrowser } from "../../fixtures/fakeCdpBrowser.js";

/** Inspect the page while answering `Target.getTargets` with `inventory`. */
const inspectWithWorkerInventory = async (
  inventory: (origin: string) => Readonly<Record<string, unknown>>,
) => {
  const browser = await startFakeCdpBrowser({
    commandResult: (command, origin) =>
      command.method === "Target.getTargets" ? inventory(origin) : undefined,
  });
  try {
    const result = await new CdpBrowserProvider().inspectPage(
      inspectWebPageInputSchema.parse({
        cdp_endpoint: browser.endpoint,
        allowed_origins: [browser.allowedOrigin],
        target_id: "allowed-page",
        observation_ms: 0,
      }),
    );
    if (!result.ok) throw result.error;
    return result.value;
  } finally {
    await browser.close();
  }
};

/**
 * A page-owned service worker `TargetInfo`, whose required `attached` flag is
 * present, `null`, or missing depending on `attachment`.
 */
const workerTarget = (
  origin: string,
  attachment: "present" | "null" | "omitted" = "present",
) => ({
  targetId: "worker-1",
  type: "service_worker",
  url: `${origin}/worker.js`,
  openerId: "allowed-page",
  ...(attachment === "omitted"
    ? {}
    : { attached: attachment === "present" ? true : null }),
});

it.each(["omitted", "null"] as const)(
  "excludes TargetInfo workers with %s required attached state",
  async (attachmentState) => {
    const value = await inspectWithWorkerInventory((origin) => ({
      targetInfos: [workerTarget(origin, attachmentState)],
    }));
    expect(value.workers).toEqual([]);
    expect(value.completeness.excluded).toContainEqual({
      section: "workers",
      reason: "invalid_protocol_value",
      count: 1,
    });
  },
);

it("reports a worker inventory without a target list as unavailable", async () => {
  const value = await inspectWithWorkerInventory(() => ({ unrelated: true }));
  expect(value.workers).toEqual([]);
  expect(value.completeness.unavailable_sections).toContain("workers");
});

it("reports a worker inventory that is not a list as unavailable", async () => {
  // `unavailable(section)` records this exclusion, so the entry below is the
  // observable that a non-list inventory is not decoded item by item.
  const value = await inspectWithWorkerInventory(() => ({
    targetInfos: "worker-one",
  }));
  expect(value.workers).toEqual([]);
  expect(value.completeness.excluded).toContainEqual({
    section: "workers",
    reason: "provider_unavailable",
    count: null,
  });
});

it("excludes a malformed worker inventory entry and keeps the ones after it", async () => {
  const value = await inspectWithWorkerInventory((origin) => ({
    targetInfos: [null, workerTarget(origin)],
  }));
  expect(value.workers).toHaveLength(1);
  expect(value.workers[0]).toMatchObject({
    target_id: "worker-1",
    type: "service_worker",
    attached: true,
    opener_target_id: "allowed-page",
    parent_frame_id: null,
  });
  expect(value.completeness.excluded).toContainEqual({
    section: "workers",
    reason: "invalid_protocol_value",
    count: 1,
  });
});

it("keeps a delivered empty worker inventory a valid empty result", async () => {
  const value = await inspectWithWorkerInventory(() => ({ targetInfos: [] }));
  expect(value.workers).toEqual([]);
  expect(value.completeness.unavailable_sections).not.toContain("workers");
  expect(value.completeness.excluded).not.toContainEqual(
    expect.objectContaining({ section: "workers" }),
  );
});
