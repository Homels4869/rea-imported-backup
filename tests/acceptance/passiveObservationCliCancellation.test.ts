import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { Socket } from "node:net";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const entrypoint = fileURLToPath(
  new URL("../../scripts/rea.mjs", import.meta.url),
);
// Windows cannot deliver a catchable signal through `child.kill(signal)`; it
// terminates the child instead of running its handler. The relay hook re-emits
// the requested signal from inside the CLI so the cancellation guard is
// exercised on every platform.
const relayHook = new URL(
  "../fixtures/passiveObservationCancellation.mjs",
  import.meta.url,
).href;
const environment = () => ({
  ...process.env,
  REA_LOG_LEVEL: "silent",
  HOPPER_LAUNCHER_PATH: "/rea-unconfigured-provider/hopper",
});

// Passive browser and V8 Inspector commands reach the selected loopback
// endpoint before they can observe anything. A stalled discovery socket keeps
// them parked exactly where an interrupt lands, so these assertions verify the
// adapter wiring and awaited cleanup rather than a racing window.
interface ObservationCommand {
  readonly command: string;
  readonly operation: string;
  readonly extra: readonly string[];
}

const passiveObservationCommands: readonly ObservationCommand[] = [
  {
    command: "list-browser-targets",
    operation: "list_browser_targets",
    extra: [],
  },
  {
    command: "inspect-web-page",
    operation: "inspect_web_page",
    extra: ["page-fixture"],
  },
  {
    command: "analyze-web-bundle",
    operation: "analyze_web_bundle",
    extra: ["page-fixture"],
  },
  {
    command: "observe-web-session",
    operation: "observe_web_session",
    extra: ["page-fixture", "--observation-ms", "30000"],
  },
  {
    command: "discover-webmcp-tools",
    operation: "discover_webmcp_tools",
    extra: ["page-fixture"],
  },
  {
    command: "capture-web-screenshot",
    operation: "capture_web_screenshot",
    extra: ["page-fixture"],
  },
  {
    command: "list-javascript-runtime-targets",
    operation: "list_javascript_runtime_targets",
    extra: [],
  },
  {
    command: "observe-javascript-runtime",
    operation: "observe_javascript_runtime",
    extra: ["page-fixture", "--observation-ms", "30000"],
  },
];

type Delivery = "os-signal" | "in-process-relay";

const cancellationCases = (delivery: Delivery) =>
  passiveObservationCommands.flatMap((entry) =>
    (["SIGINT", "SIGTERM"] as const).map((signal) => ({
      ...entry,
      signal,
      expectedExitCode: signal === "SIGINT" ? 130 : 143,
      delivery,
    })),
  );

const assertInterruptedCommand = async (
  { command, operation, extra }: ObservationCommand,
  signal: "SIGINT" | "SIGTERM",
  expectedExitCode: number,
  delivery: Delivery,
): Promise<void> => {
  const sockets = new Set<Socket>();
  const server = createServer(() => undefined);
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("Expected a TCP loopback listener");
  const endpoint = `http://127.0.0.1:${String(address.port)}`;
  const contacted = once(server, "request");

  const relayed = delivery === "in-process-relay";
  const child = spawn(
    process.execPath,
    [
      ...(relayed ? ["--import", relayHook] : []),
      entrypoint,
      command,
      endpoint,
      ...extra,
      "--json",
    ],
    {
      env: relayed
        ? { ...environment(), REA_TEST_INTERRUPT_SIGNAL: signal }
        : environment(),
      stdio: relayed
        ? ["ignore", "pipe", "pipe", "ipc"]
        : ["ignore", "pipe", "pipe"],
    },
  );
  const closed = once(child, "close");
  let stdout = "";
  const output = child.stdout;
  if (output === null) throw new Error("Expected a piped CLI stdout");
  output.setEncoding("utf8");
  output.on("data", (chunk: string) => {
    stdout += chunk;
  });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 10_000);
  try {
    let contactTimeout: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        contacted,
        new Promise<never>((_resolve, reject) => {
          contactTimeout = setTimeout(
            () => reject(new Error("CLI did not contact the CDP fixture")),
            5_000,
          );
        }),
      ]);
    } finally {
      if (contactTimeout !== undefined) clearTimeout(contactTimeout);
    }
    if (relayed) child.send("interrupt");
    else child.kill(signal);
    const [exitCode, terminationSignal] = await closed;
    expect(terminationSignal).toBeNull();
    expect(exitCode).toBe(expectedExitCode);
    expect(JSON.parse(stdout)).toMatchObject({
      code: "cancelled",
      category: "cancelled",
      details: { cleanup: "complete", operation },
    });
  } finally {
    clearTimeout(timeout);
    try {
      if (child.exitCode === null && child.signalCode === null)
        child.kill("SIGKILL");
      await closed;
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
};

it.skipIf(process.platform === "win32").each(cancellationCases("os-signal"))(
  "$command preserves $signal status and awaited cleanup when cancellation interrupts CDP discovery",
  async ({ command, operation, extra, signal, expectedExitCode, delivery }) =>
    await assertInterruptedCommand(
      { command, operation, extra },
      signal,
      expectedExitCode,
      delivery,
    ),
);

// Windows keeps the same coverage through the relay hook, because the OS
// cannot deliver a catchable signal to the child there.
it
  .runIf(process.platform === "win32")
  .each(cancellationCases("in-process-relay"))(
  "$command preserves $signal status and awaited cleanup when cancellation interrupts CDP discovery",
  async ({ command, operation, extra, signal, expectedExitCode, delivery }) =>
    await assertInterruptedCommand(
      { command, operation, extra },
      signal,
      expectedExitCode,
      delivery,
    ),
);
