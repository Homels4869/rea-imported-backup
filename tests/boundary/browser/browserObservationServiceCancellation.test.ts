import { expect, it } from "vitest";

import {
  analyzeWebBundle,
  captureWebScreenshot,
  discoverWebMcpTools,
  inspectWebPage,
  observeWebSession,
} from "../../../src/application/BrowserObservationService.js";
import type { BrowserObservationPort } from "../../../src/application/BrowserObservationPort.js";
import { CdpBrowserProvider } from "../../../src/browser/CdpBrowserProvider.js";
import { inspectWebPageInputSchema } from "../../../src/domain/browserObservation.js";
import { observeWebSessionInputSchema } from "../../../src/domain/browserSession.js";
import { analyzeWebBundleInputSchema } from "../../../src/domain/webBundleAnalysis.js";
import { discoverWebMcpToolsInputSchema } from "../../../src/domain/webMcpDiscovery.js";
import { captureWebScreenshotInputSchema } from "../../../src/domain/webScreenshot.js";
import {
  startFakeCdpBrowser,
  type FakeCdpBrowser,
} from "../../fixtures/fakeCdpBrowser.js";
import { trackBrowser } from "./cdpBrowserProvider.support.js";

// An interrupt that lands while the provider is awaiting cleanup arrives after
// the capture has already succeeded. The provider owns its transport and closes
// it before returning, so it legitimately reports the completed capture. The
// application boundary is the last stage that can still see the caller's signal,
// so it must not publish that capture as evidence once the caller has cancelled.
const cases = [
  {
    operation: "inspect_web_page",
    run: (
      provider: BrowserObservationPort,
      endpoint: string,
      signal: AbortSignal,
    ) =>
      inspectWebPage(
        provider,
        inspectWebPageInputSchema.parse({
          cdp_endpoint: endpoint,
          target_id: "allowed-page",
          observation_ms: 0,
        }),
        { signal },
      ),
  },
  {
    operation: "analyze_web_bundle",
    run: (
      provider: BrowserObservationPort,
      endpoint: string,
      signal: AbortSignal,
    ) =>
      analyzeWebBundle(
        provider,
        analyzeWebBundleInputSchema.parse({
          cdp_endpoint: endpoint,
          target_id: "allowed-page",
          observation_ms: 0,
        }),
        { signal },
      ),
  },
  {
    operation: "observe_web_session",
    run: (
      provider: BrowserObservationPort,
      endpoint: string,
      signal: AbortSignal,
    ) =>
      observeWebSession(
        provider,
        observeWebSessionInputSchema.parse({
          cdp_endpoint: endpoint,
          target_id: "allowed-page",
          observation_ms: 1,
        }),
        { signal },
      ),
  },
  {
    operation: "discover_webmcp_tools",
    run: (
      provider: BrowserObservationPort,
      endpoint: string,
      signal: AbortSignal,
    ) =>
      discoverWebMcpTools(
        provider,
        discoverWebMcpToolsInputSchema.parse({
          cdp_endpoint: endpoint,
          target_id: "allowed-page",
          observation_ms: 0,
        }),
        { signal },
      ),
  },
  {
    operation: "capture_web_screenshot",
    run: (
      provider: BrowserObservationPort,
      endpoint: string,
      signal: AbortSignal,
    ) =>
      captureWebScreenshot(
        provider,
        captureWebScreenshotInputSchema.parse({
          cdp_endpoint: endpoint,
          target_id: "allowed-page",
        }),
        { signal },
      ),
  },
] as const;

it.each(cases)(
  "does not publish $operation evidence when the caller cancels during awaited cleanup",
  async ({ operation, run }) => {
    const browser = await startFakeCdpBrowser({ hangOnMethod: "Page.disable" });
    trackBrowser(browser);
    const controller = new AbortController();
    const pending = run(
      new CdpBrowserProvider(),
      browser.endpoint,
      controller.signal,
    );
    await waitForCommand(browser, "Page.disable");
    controller.abort();
    const result = await pending;

    expect(result).toMatchObject({
      ok: false,
      error: { _tag: "AnalysisCancelledError", operation },
    });
  },
);

const waitForCommand = async (
  browser: FakeCdpBrowser,
  method: string,
): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (browser.commands.some((command) => command.method === method)) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for fake CDP command ${method}`);
};
