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

describe("server-sent event endpoints", () => {
  it("reports EventSource URLs like WebSocket URLs", () => {
    expect(
      endpoints(`
        new WebSocket("wss://chat.example/ws");
        new EventSource("/api/chat/stream");
        new window.EventSource("https://chat.example/events", { withCredentials: true });
      `),
    ).toEqual([
      {
        kind: "network",
        value: "wss://chat.example/ws",
        mechanism: "call:WebSocket",
      },
      {
        kind: "network",
        value: "/api/chat/stream",
        mechanism: "call:EventSource",
      },
      {
        kind: "network",
        value: "https://chat.example/events",
        mechanism: "call:window.EventSource",
      },
    ]);
  });

  it("retains a dynamic EventSource URL as a partial endpoint", () => {
    expect(endpoints("new EventSource(url);")).toEqual([
      {
        kind: "network",
        value: "url",
        mechanism: "call:EventSource",
        resolution: "partial",
      },
    ]);
  });
});
