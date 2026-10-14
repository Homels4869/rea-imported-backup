import { describe, expect, it } from "vitest";

import { analyzeJavaScriptStaticSource } from "./javascriptStaticAnalysis.js";

const endpoints = (source: string) =>
  analyzeJavaScriptStaticSource(source).endpoints.map(
    ({ kind, value, mechanism, resolution }) => ({
      kind,
      value,
      mechanism,
      ...(resolution === undefined ? {} : { resolution }),
    }),
  );

describe("beacon endpoints", () => {
  it("reports navigator.sendBeacon URLs", () => {
    expect(
      endpoints(`
        navigator.sendBeacon("/api/telemetry", payload);
        window.navigator.sendBeacon("https://metrics.example/collect");
      `),
    ).toEqual([
      {
        kind: "network",
        value: "/api/telemetry",
        mechanism: "call:navigator.sendBeacon",
      },
      {
        kind: "network",
        value: "https://metrics.example/collect",
        mechanism: "call:window.navigator.sendBeacon",
      },
    ]);
  });

  it("retains a dynamic beacon URL as a partial endpoint", () => {
    expect(endpoints("navigator.sendBeacon(url, payload);")).toEqual([
      {
        kind: "network",
        value: "url",
        mechanism: "call:navigator.sendBeacon",
        resolution: "partial",
      },
    ]);
  });
});
