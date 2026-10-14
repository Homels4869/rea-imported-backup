import { z } from "zod";
import { chmod, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AndroidAnalysisPort } from "../application/android/AndroidAnalysisPort.js";
import type { ExecutionOptions } from "../application/AnalysisProvider.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import {
  AnalysisCancelledError,
  AnalysisCapabilityUnavailableError,
  AnalysisOutputError,
  AnalysisInputError,
  AnalysisResourceConstraintError,
  AnalysisTimeoutError,
} from "../domain/analysisErrorCore.js";
import { ProviderAdapterError } from "../domain/providerAdapterError.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
import type { AndroidRequest } from "../domain/android/androidAnalysis.js";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import { err, ok, type Result } from "../domain/result.js";
import {
  createJadxWorkspaceRoot,
  type JadxWorkspaceRoot,
} from "./JadxWorkspaceRoot.js";
import {
  snapshotAndroidEngine,
  snapshotAndroidTarget,
} from "./AndroidTargetSnapshot.js";
import { hashStableFile } from "../filesystem/StableFileHash.js";
import { RegularFileChangedError } from "../filesystem/RegularFile.js";
import {
  inspectJadxAvailability,
  resolveJadxConfigurationInputs,
  validateJadxConfiguration,
} from "./JadxConfiguration.js";
import { jadxHeapExhausted } from "./JadxProtocol.js";
import { JADX_HEAP_EXHAUSTION_REMEDIATION } from "./JadxRelease.js";
import type { JadxLauncher } from "./JadxMcpTransport.js";

import { JadxSession } from "./JadxSession.js";

const OPERATION_TIMEOUT_MS = 120_000;
const BRIDGE_SOURCE = fileURLToPath(
  new URL("../../bridge/android/ReaJadxBridge.java", import.meta.url),
);
type Outcome = Awaited<ReturnType<AndroidAnalysisPort["execute"]>>;

const waitForTurn = (
  predecessor: Promise<void>,
  request: AndroidRequest,
  signal?: AbortSignal,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const abort = () => reject(new AnalysisCancelledError(request.operation));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted === true) abort();
    void predecessor.then(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    });
  });

const executionError = (context: {
  cause: unknown;
  request: AndroidRequest;
  timeout: AbortSignal;
  signal: AbortSignal | undefined;
  session: JadxSession | undefined;
}): AnalysisError => {
  const { cause, request, timeout, signal, session } = context;
  if (signal?.aborted === true)
    return new AnalysisCancelledError(request.operation);
  if (timeout.aborted)
    return new AnalysisTimeoutError(request.operation, OPERATION_TIMEOUT_MS);
  if (cause instanceof AnalysisError) return cause;
  const protocolFailure = session?.transport.failureReason();
  if (protocolFailure !== undefined && protocolFailure !== null)
    return new AnalysisOutputError(request.operation, protocolFailure, {
      cause,
    });
  if (cause instanceof z.ZodError)
    return new AnalysisOutputError(
      request.operation,
      "JADX response violated the pinned upstream protocol",
      { cause },
    );
  if (session !== undefined && !session.initialized()) {
    const stderr = session.transport.diagnostics();
    const capturedOutput = {
      stdout: "",
      stderr,
      truncated: session.transport.diagnosticsTruncated(),
    };
    // The launcher died before the protocol handshake, so its retained stderr is
    // the only evidence of why. A heap shortage there is answered by a setting,
    // which is a different reply from one for a launcher that never started.
    if (jadxHeapExhausted(stderr))
      return new AnalysisResourceConstraintError(
        request.operation,
        "memory",
        "The JADX worker JVM ran out of heap before REA's Android bridge answered",
        {
          // No runtime fact was observed: the bridge never reported the heap it
          // had, so the limit stays unknown rather than measured.
          observed_max_heap_bytes: null,
        },
        {
          cause,
          remediationAction: JADX_HEAP_EXHAUSTION_REMEDIATION,
          capturedOutput,
          diagnostics: {
            reason: cause instanceof Error ? cause.message : String(cause),
          },
        },
      );
    // A launcher that dies instantly, as one does when the requested heap is
    // below the JVM's own minimum, can be inspected before its stderr has been
    // read. Say that no diagnostics arrived instead of pointing at output that
    // is not there.
    const diagnostics =
      stderr.length === 0
        ? " The launcher produced no diagnostics before it stopped."
        : ` Java diagnostics: ${stderr}`;
    const reason = `Java could not start REA's Android bridge using ${session.transport.options.command}: ${cause instanceof Error ? cause.message : String(cause)}.${diagnostics} REA's pre-launch checks confirmed the selected JDK lists jdk.compiler and that the engine archive holds its expected entry names. Those checks do not establish that the launcher runs or that the whole archive is intact, so this reports what the launcher said instead of naming a cause.`;
    return new AnalysisCapabilityUnavailableError(
      "jadx",
      request.operation,
      reason,
      {
        cause,
        userMessage: reason,
        capturedOutput,
      },
    );
  }
  return new ProviderAdapterError("jadx", request.operation, {
    cause,
    diagnostics: {
      reason: cause instanceof Error ? cause.message : String(cause),
      stderr: session?.transport.diagnostics() ?? "",
    },
  });
};

const androidTargetChanged = (
  operation: string,
  path: string,
  cause?: unknown,
): AnalysisInputError =>
  new AnalysisInputError(
    operation,
    cause === undefined ? undefined : { cause },
    [
      {
        path: ["path"],
        reason: "invalid_value",
        message: `APK bytes changed after admission at ${path}; retry against a stable file.`,
      },
    ],
  );

const androidSourceChanged = (
  operation: string,
  source: string,
  cause?: unknown,
): AnalysisCapabilityUnavailableError =>
  new AnalysisCapabilityUnavailableError(
    "jadx",
    operation,
    `Selected JADX input bytes changed during admission at ${source}; retry with a stable installation.`,
    cause === undefined ? undefined : { cause },
  );

const hashAndroidSource = async (
  path: string,
  operation: string,
  signal: AbortSignal,
): Promise<string> => {
  try {
    return (await hashStableFile(path, signal)).sha256;
  } catch (cause: unknown) {
    if (signal.aborted) throw cause;
    if (cause instanceof RegularFileChangedError)
      throw androidSourceChanged(operation, path, cause);
    throw cause;
  }
};

interface PendingCleanup {
  session: JadxSession | undefined;
  root: JadxWorkspaceRoot | undefined;
  readonly previousError: AnalysisError | undefined;
}

const cleanup = async (
  resources: PendingCleanup,
): Promise<Result<void, AnalysisError>> => {
  const { session, root, previousError } = resources;
  const diagnostics = {
    previous_error:
      previousError === undefined ? null : projectAnalysisError(previousError),
  };
  try {
    await session?.close();
    resources.session = undefined;
  } catch (cause) {
    // Retain an uncertain workspace until the caller can resolve process ownership.
    const error = new ProviderCleanupError(
      "jadx",
      [
        session?.transport.runId ?? "unknown",
        ...(root === undefined ? [] : [root.path]),
      ],
      {
        ...diagnostics,
        reason: cause instanceof Error ? cause.message : String(cause),
        provider_cleanup:
          cause instanceof ProviderCleanupError
            ? (cause.diagnostics ?? null)
            : null,
      },
      { cause: previousError ?? cause },
    );
    if (previousError?.partialObservation !== undefined)
      error.retainPartialObservation(previousError.partialObservation);
    return err(error);
  }
  try {
    await root?.close();
    resources.root = undefined;
  } catch (cause) {
    const error = new ProviderCleanupError(
      "jadx",
      [root?.path ?? "unknown"],
      {
        ...diagnostics,
        reason: cause instanceof Error ? cause.message : String(cause),
      },
      { cause: previousError ?? cause },
    );
    if (previousError?.partialObservation !== undefined)
      error.retainPartialObservation(previousError.partialObservation);
    return err(error);
  }
  return ok(undefined);
};

interface RetainedSession {
  readonly key: string;
  readonly root: JadxWorkspaceRoot;
  readonly session: JadxSession;
  readonly snapshot: string;
  readonly jarHash: string;
  readonly bridgeHash: string;
}

/** One serialized, immutable APK session per REA instance, retired on idle or shutdown. */
export class JadxProvider implements AndroidAnalysisPort {
  #tail: Promise<void> = Promise.resolve();
  #pendingCleanup: PendingCleanup | undefined;
  #retained: RetainedSession | undefined;
  #idle: NodeJS.Timeout | undefined;
  readonly #shutdown = new AbortController();
  #closePromise: Promise<void> | undefined;
  constructor(
    readonly environment: Readonly<Record<string, string | undefined>>,
    readonly launcher?: JadxLauncher,
  ) {}

  /** Report actual local prerequisites without starting JADX or opening a target. */
  inspectAvailability(signal?: AbortSignal) {
    return inspectJadxAvailability(this.environment, signal);
  }

  /** Serialize expensive work and bind both raw and normalized results to the APK. */
  async execute(
    target: BinaryTarget,
    request: AndroidRequest,
    options?: ExecutionOptions,
  ): Promise<Outcome> {
    if (this.#shutdown.signal.aborted)
      return err(new AnalysisCancelledError(request.operation));
    const signal =
      options?.signal === undefined
        ? this.#shutdown.signal
        : AbortSignal.any([options.signal, this.#shutdown.signal]);
    const predecessor = this.#tail;
    let release: () => void = () => {};
    this.#tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await waitForTurn(predecessor, request, signal);
    } catch {
      void predecessor.then(release);
      return err(new AnalysisCancelledError(request.operation));
    }
    try {
      if (signal.aborted)
        return err(new AnalysisCancelledError(request.operation));
      clearTimeout(this.#idle);
      if (this.#pendingCleanup !== undefined) {
        const retired = await this.#retire();
        if (!retired.ok) return retired;
      }
      const outcome = await this.#execute(target, request, { signal });
      if (outcome.ok) this.#scheduleIdle();
      return outcome;
    } finally {
      release();
    }
  }

  /** Cancel queued/active operations and join the owned engine and workspace cleanup. */
  close(): Promise<void> {
    this.#shutdown.abort();
    clearTimeout(this.#idle);
    this.#closePromise ??= this.#tail
      .then(async () => {
        const retired = await this.#retire();
        if (!retired.ok) throw retired.error;
      })
      .catch((cause: unknown) => {
        this.#closePromise = undefined;
        throw cause;
      });
    return this.#closePromise;
  }

  async #retire(): Promise<Result<void, AnalysisError>> {
    if (this.#pendingCleanup === undefined && this.#retained !== undefined) {
      this.#pendingCleanup = {
        session: this.#retained.session,
        root: this.#retained.root,
        previousError: undefined,
      };
      this.#retained = undefined;
    }
    if (this.#pendingCleanup === undefined) return ok(undefined);
    const result = await cleanup(this.#pendingCleanup);
    if (result.ok) this.#pendingCleanup = undefined;
    return result;
  }

  #scheduleIdle(): void {
    this.#idle = setTimeout(() => {
      this.#tail = this.#tail.then(async () => {
        await this.#retire();
      });
    }, 60_000);
    this.#idle.unref();
  }

  async #execute(
    target: BinaryTarget,
    request: AndroidRequest,
    options?: ExecutionOptions,
  ): Promise<Outcome> {
    const timeout = AbortSignal.timeout(OPERATION_TIMEOUT_MS);
    const signal =
      options?.signal === undefined
        ? timeout
        : AbortSignal.any([options.signal, timeout]);
    let root: JadxWorkspaceRoot | undefined;
    let session: JadxSession | undefined;
    try {
      if (target.format !== "apk")
        throw new AnalysisCapabilityUnavailableError(
          "jadx",
          request.operation,
          `Target ${target.path} is ${target.format}; provide one standalone APK.`,
        );
      const configuration = await resolveJadxConfigurationInputs(
        this.environment,
        request.operation,
        signal,
      );
      signal.throwIfAborted();
      const jarHash = await hashAndroidSource(
        configuration.jar,
        request.operation,
        signal,
      );
      const bridgeHash = await hashAndroidSource(
        BRIDGE_SOURCE,
        request.operation,
        signal,
      );
      let targetHash: string;
      try {
        targetHash = (await hashStableFile(target.path, signal)).sha256;
      } catch (cause: unknown) {
        if (signal.aborted) throw cause;
        if (cause instanceof RegularFileChangedError)
          throw androidTargetChanged(request.operation, target.path, cause);
        throw cause;
      }
      if (targetHash !== target.sha256)
        throw androidTargetChanged(request.operation, target.path);
      const key = JSON.stringify({
        path: target.path,
        sha256: target.sha256,
        jar: configuration.jar,
        jarHash,
        bridgeHash,
        java: configuration.java,
        arguments: configuration.jvmArguments,
        options: [
          this.environment.JAVA_TOOL_OPTIONS,
          this.environment._JAVA_OPTIONS,
          this.environment.JDK_JAVA_OPTIONS,
          this.environment.PATH,
          this.environment.JAVA_HOME,
        ],
      });
      if (this.#retained !== undefined && this.#retained.key !== key) {
        const retired = await this.#retire();
        if (!retired.ok) return retired;
      }
      let retained = this.#retained;
      if (retained === undefined) {
        await validateJadxConfiguration(
          configuration,
          this.environment,
          request.operation,
          signal,
        );
        root = await createJadxWorkspaceRoot();
        const workspaceSignal =
          root.failureSignal === undefined
            ? signal
            : AbortSignal.any([signal, root.failureSignal]);
        const engine = await snapshotAndroidEngine(
          configuration.jar,
          jarHash,
          root.path,
          request.operation,
          workspaceSignal,
        );
        const snapshot = await snapshotAndroidTarget(
          target.path,
          target.sha256,
          root.path,
          request.operation,
          workspaceSignal,
        );
        const bridge = join(root.path, "ReaJadxBridge.java");
        await copyFile(BRIDGE_SOURCE, bridge);
        await chmod(bridge, 0o400);
        const copiedBridgeHash = await hashAndroidSource(
          bridge,
          request.operation,
          workspaceSignal,
        );
        if (copiedBridgeHash !== bridgeHash)
          throw androidSourceChanged(
            request.operation,
            BRIDGE_SOURCE,
            undefined,
          );
        workspaceSignal.throwIfAborted();
        session = new JadxSession(
          {
            command: configuration.java,
            arguments: [
              ...configuration.jvmArguments,
              "--class-path",
              engine.path,
              bridge,
            ],
            cwd: root.path,
            hostEnvironment: this.environment,
            signal: workspaceSignal,
          },
          this.launcher,
        );
        retained = {
          key,
          root,
          session,
          snapshot,
          jarHash: engine.sha256,
          bridgeHash,
        };
      }
      root = retained.root;
      session = retained.session;
      const activeSignal =
        root.failureSignal === undefined
          ? signal
          : AbortSignal.any([signal, root.failureSignal]);
      const { snapshot } = retained;
      const outcome = ok(
        await session.execute({
          request,
          target,
          snapshot,
          jarHash: retained.jarHash,
          bridgeHash: retained.bridgeHash,
          signal: activeSignal,
        }),
      );
      activeSignal.throwIfAborted();
      this.#retained = retained;
      return outcome;
    } catch (cause) {
      const previousError = executionError({
        cause,
        request,
        timeout,
        signal: options?.signal,
        session,
      });
      const partialObservation = session?.partialObservation();
      if (partialObservation !== undefined)
        previousError.retainPartialObservation(partialObservation);
      // Admission can fail before selecting an existing session for execution.
      root ??= this.#retained?.root;
      session ??= this.#retained?.session;
      this.#retained = undefined;
      this.#pendingCleanup = { session, root, previousError };
      const retired = await this.#retire();
      return retired.ok ? err(previousError) : retired;
    }
  }
}
