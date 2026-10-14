import { describe, expect, it } from "vitest";

import {
  browserEndpointSchema,
  browserObservationEndpointSchema,
  browserOriginSchema,
  recordedBrowserObservationEndpointSchema,
  sanitizeEndpointCandidate,
  sanitizeBrowserUrl,
} from "./browserObservation.js";
import { parseRecordedTransportUrl } from "./recordedTransportUrl.js";

describe("browser observation contracts", () => {
  it("normalizes exact HTTP origins without accepting broader URL scopes", () => {
    expect(browserOriginSchema.parse("https://Example.COM:443")).toBe(
      "https://example.com",
    );
    expect(browserOriginSchema.parse("http://example.com:80")).toBe(
      "http://example.com",
    );
    for (const value of [
      "https://*.example.com",
      "https://example.com/path",
      "https://example.com/?token=secret",
      "https://example.com/?",
      "https://example.com/#",
      "https://user:pass@example.com",
      "file:///tmp/page.html",
    ])
      expect(browserOriginSchema.safeParse(value).success, value).toBe(false);
  });

  it("accepts only literal loopback HTTP CDP endpoints", () => {
    expect(browserEndpointSchema.parse("http://127.0.0.1:9222")).toBe(
      "http://127.0.0.1:9222",
    );
    expect(browserEndpointSchema.parse("http://[::1]:9222")).toBe(
      "http://[::1]:9222",
    );
    for (const value of [
      "http://localhost:9222",
      "http://192.168.1.2:9222",
      "https://127.0.0.1:9222",
      "http://127.0.0.1:9222/json/list",
      "http://127.0.0.1:9222/?",
      "http://127.0.0.1:9222/#",
      "http://user:pass@127.0.0.1:9222",
    ])
      expect(browserEndpointSchema.safeParse(value).success, value).toBe(false);
  });

  it("accepts a loopback browser socket and records it without its identifier", () => {
    expect(
      browserObservationEndpointSchema.parse("http://127.0.0.1:9222/"),
    ).toEqual({
      transport: "http_discovery",
      url: "http://127.0.0.1:9222",
      recorded: "http://127.0.0.1:9222",
    });
    expect(
      browserObservationEndpointSchema.parse(
        "ws://[::1]:9222/devtools/browser/0b1c-socket-id",
      ),
    ).toEqual({
      transport: "browser_websocket",
      url: "ws://[::1]:9222/devtools/browser/0b1c-socket-id",
      recorded: "ws://[::1]:9222/devtools/browser/[REDACTED]",
    });
    for (const value of [
      "ws://127.0.0.1/devtools/browser/id",
      "ws://localhost:9222/devtools/browser/id",
      "wss://127.0.0.1:9222/devtools/browser/id",
      "ws://user:pass@127.0.0.1:9222/devtools/browser/id",
      "ws://127.0.0.1:9222/devtools/browser/id?token=x",
      "ws://127.0.0.1:9222/devtools/browser/id#fragment",
      "ws://127.0.0.1:9222/devtools/browser/id?",
      "ws://127.0.0.1:9222/devtools/browser/id#",
      "ws://127.0.0.1:9222/devtools/browser/",
      "ws://127.0.0.1:9222/devtools/browser/id/extra",
      "ws://127.0.0.1:9222/devtools/page/id",
    ])
      expect(
        browserObservationEndpointSchema.safeParse(value).success,
        value,
      ).toBe(false);
  });

  it("accepts recorded browser sockets only in their redacted form", () => {
    for (const value of [
      "http://127.0.0.1:9222",
      "ws://127.0.0.1:9222/devtools/browser/[REDACTED]",
    ])
      expect(
        recordedBrowserObservationEndpointSchema.safeParse(value).success,
        value,
      ).toBe(true);
    expect(
      recordedBrowserObservationEndpointSchema.safeParse(
        "ws://127.0.0.1:9222/devtools/browser/0b1c-socket-id",
      ).success,
    ).toBe(false);
  });
});

describe("relative transport URL credentials and retention", () => {
  it("removes userinfo from network references without changing recorded separators or diagnostics", () => {
    const cases = [
      [
        "//reader:transport-secret@api.example.test/a/../items?x=a+b&x=two#part",
        "//api.example.test/a/../items?x=a+b&x=two#part",
      ],
      [
        String.raw`\\reader:transport-secret@api.example.test\a\..\items?x=a+b&x=two#part`,
        String.raw`\\api.example.test\a\..\items?x=a+b&x=two#part`,
      ],
      [
        String.raw`/\reader:transport-secret@api.example.test\items?x=1#part`,
        String.raw`/\api.example.test\items?x=1#part`,
      ],
      [
        String.raw`\/reader:transport-secret@api.example.test\items?x=1#part`,
        String.raw`\/api.example.test\items?x=1#part`,
      ],
      [
        " \t////reader:transport-secret@api.example.test/items?x=1#part",
        " \t////api.example.test/items?x=1#part",
      ],
      [
        "//reader:transport-secret@[invalid/items?x=1#part",
        "//[invalid/items?x=1#part",
      ],
      [
        "https://reader:transport-secret@[invalid/items?x=1#part",
        "https://[invalid/items?x=1#part",
      ],
    ] as const;
    for (const [value, expected] of cases) {
      expect(parseRecordedTransportUrl(value)).toMatchObject({
        origin: null,
        path: null,
        credentials: {
          start: value.indexOf("reader"),
          end: value.indexOf("@") + 1,
        },
      });
      expect(sanitizeBrowserUrl(value)).toEqual({
        url: expected,
        origin: null,
        query_parameter_names: [],
        redacted: true,
      });
      expect(sanitizeEndpointCandidate(value)).toBe(expected);
    }
  });

  it("redacts ambiguous relative userinfo without publishing a synthetic base or origin", () => {
    const value =
      "//rea\tder:transport-\nsecret@api.example.test/a/../items?x=a+b&x=two#part";
    expect(parseRecordedTransportUrl(value)).toMatchObject({
      origin: null,
      path: null,
      credentials: "ambiguous",
    });
    expect(sanitizeBrowserUrl(value)).toEqual({
      url: "//api.example.test/items?x=a+b&x=two#part",
      origin: null,
      query_parameter_names: [],
      redacted: true,
    });
    expect(
      parseRecordedTransportUrl(
        "https:reader:transport-secret@api.example.test/items",
      ),
    ).toEqual({
      origin: "https://api.example.test",
      path: null,
      credentials: "ambiguous",
    });
  });

  it("keeps credential-free references and userinfo-like path data unchanged", () => {
    for (const value of [
      String.raw`\reader:transport-secret@api.example.test\items?x=1#part`,
      String.raw`.\reader:transport-secret@api.example.test\items?x=1#part`,
      String.raw`..\reader:transport-secret@api.example.test\items?x=1#part`,
      String.raw`\\api.example.test\items?x=a+b&x=two#part`,
      String.raw`/\api.example.test\items?x=a+b&x=two#part`,
      String.raw`\\api.example.test\reader:transport-secret@literal?x=1#part`,
      "//api.example.test/items?next=reader:transport-secret@literal#part",
    ]) {
      expect(parseRecordedTransportUrl(value)).toMatchObject({
        origin: null,
        path: null,
        credentials: null,
      });
      expect(sanitizeBrowserUrl(value)).toEqual({
        url: value,
        origin: null,
        query_parameter_names: [],
        redacted: false,
      });
    }
  });
});

describe("browser observation sensitive surfaces and retention", () => {
  it("removes only URL userinfo and preserves the original query and fragment", () => {
    expect(
      sanitizeBrowserUrl(
        "https://user:pass@app.example.test/path?token=secret&mode=full&token=again#part",
      ),
    ).toEqual({
      url: "https://app.example.test/path?token=secret&mode=full&token=again#part",
      origin: "https://app.example.test",
      query_parameter_names: ["token", "mode", "token"],
      redacted: true,
    });

    const backslashAuthority = String.raw`https:\\user:pass@app.example.test/path?x=a+b&x=two#part`;
    const sanitized = sanitizeBrowserUrl(backslashAuthority);
    expect(sanitized.url).toBe(
      "https://app.example.test/path?x=a+b&x=two#part",
    );
    expect(sanitized.url).not.toContain("user:pass");
    expect(sanitized.redacted).toBe(true);
  });

  it("retains ordinary query values and malformed URL diagnostics", () => {
    const longName = `a${"x".repeat(400)}`;
    const parameters = [
      `${longName}=secret`,
      ...Array.from(
        { length: 300 },
        (_value, index) => `k${String(index).padStart(3, "0")}=secret`,
      ),
    ].join("&");
    const sanitized = sanitizeBrowserUrl(
      `https://app.example.test/path?${parameters}`,
    );
    expect(sanitized.query_parameter_names).toHaveLength(301);
    expect(sanitized.query_parameter_names).toContain(longName);
    expect(sanitized.url).toContain(`${longName}=secret`);
    expect(sanitized.url).toContain("k299=secret");

    const oversized = sanitizeBrowserUrl(
      `https://app.example.test/${"p".repeat(70_000)}`,
    );
    expect(oversized.origin).toBe("https://app.example.test");
    expect(oversized.url.length).toBeGreaterThan(70_000);
    expect(oversized.redacted).toBe(false);

    const malformed = "https://[invalid?token=diagnostic#fragment";
    expect(sanitizeBrowserUrl(malformed)).toEqual({
      url: malformed,
      origin: null,
      query_parameter_names: [],
      redacted: false,
    });
    expect(sanitizeEndpointCandidate(malformed)).toBe(malformed);
    expect(sanitizeEndpointCandidate("/api/search?q=rea#results")).toBe(
      "/api/search?q=rea#results",
    );
  });
});
