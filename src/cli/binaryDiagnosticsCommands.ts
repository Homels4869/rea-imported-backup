import { z } from "incur";
import { resolve } from "node:path";
import {
  createRecordedCrashService,
  createBinaryLayoutService,
  createPeResourcesService,
  createPriResourcesService,
} from "../composition/binaryDiagnostics.js";
import { CLI_COMMANDS } from "../cliCommandNames.js";
import { logCliCommand } from "../cliLogging.js";
import type { Logger } from "pino";
import type { CliInstance } from "./types.js";
import { withCommandCancellation } from "./commandCancellation.js";
import { inspectPeResourcesInputSchema } from "../domain/native/peResources.js";
import {
  inspectPriResourcesInputSchema,
  PRI_VALUE_TYPES,
} from "../domain/native/priResources.js";
import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
import { finishAnalysisCommand } from "./finishAnalysisCommand.js";

/** Split `NAME=VALUE`; a missing `=` leaves the value absent for input validation. */
const qualifierOption = (option: string) => {
  const separator = option.indexOf("=");
  return separator === -1
    ? { name: option }
    : {
        name: option.slice(0, separator),
        value: option.slice(separator + 1),
      };
};

const priOptions = z.object({
  collection: inspectPriResourcesInputSchema.shape.collection,
  name: z
    .array(z.string())
    .optional()
    .describe(
      "Repeat to select exact full resource names, such as Resources/AppDisplayName",
    ),
  query: z
    .string()
    .optional()
    .describe("Case-insensitive substring of full resource names"),
  qualifier: z
    .array(z.string())
    .optional()
    .describe(
      "Repeat NAME=VALUE to keep candidates with that qualifier value, such as Language=en-US",
    ),
  valueType: z
    .array(z.enum(PRI_VALUE_TYPES))
    .optional()
    .describe(
      "Repeat to keep stored value types; strings are String, AsciiString or Utf8String",
    ),
  offset: inspectPriResourcesInputSchema.shape.offset,
  limit: inspectPriResourcesInputSchema.shape.limit,
  maxFileBytes: inspectPriResourcesInputSchema.shape.max_file_bytes,
});

/** Map CLI flags onto the shared selection; omitted selectors stay absent. */
const priSelection = (path: string, options: z.infer<typeof priOptions>) => ({
  path: resolve(path),
  collection: options.collection,
  ...(options.name === undefined ? {} : { names: options.name }),
  ...(options.query === undefined ? {} : { query: options.query }),
  ...(options.qualifier === undefined
    ? {}
    : { qualifiers: options.qualifier.map(qualifierOption) }),
  ...(options.valueType === undefined
    ? {}
    : { value_types: options.valueType }),
  offset: options.offset,
  limit: options.limit,
  max_file_bytes: options.maxFileBytes,
});

/** Inspect an operator-selected PRI file through the same workflow as MCP. */
const registerPriResourcesCommand = (cli: CliInstance, logger: Logger) =>
  cli.command(CLI_COMMANDS.inspectPriResources, {
    description:
      "Inspect Windows PRI resource index names, qualifiers, string/path values and embedded data ranges",
    args: z.object({ path: z.string().describe("Local .pri resource index") }),
    options: priOptions,
    run: ({ args, options }) =>
      withCommandCancellation(async (signal) => {
        const pri = createPriResourcesService();
        return await logCliCommand(
          logger,
          CLI_COMMANDS.inspectPriResources,
          async () =>
            finishAnalysisCommand(
              () => pri.inspect(priSelection(args.path, options), { signal }),
              pri,
              "rea-pri-resources",
              "inspect_pri_resources",
            ),
        );
      }),
  });

/** Inspect operator-selected files through the same shared workflow as MCP. */
export const registerBinaryDiagnosticsCommands = (
  cli: CliInstance,
  logger: Logger,
  environment: Readonly<NodeJS.ProcessEnv>,
): void => {
  cli.command(CLI_COMMANDS.inspectPeResources, {
    description:
      "Inspect PE resource identities, payload ranges, hashes and icon-group relationships",
    args: z.object({ path: z.string().describe("Local PE32/PE32+ image") }),
    options: z.object({
      maxFileBytes: inspectPeResourcesInputSchema.shape.max_file_bytes,
      maxEntries: inspectPeResourcesInputSchema.shape.max_entries,
    }),
    run: ({ args, options }) =>
      withCommandCancellation(async (signal) => {
        const pe = createPeResourcesService();
        return await logCliCommand(
          logger,
          CLI_COMMANDS.inspectPeResources,
          async () =>
            finishAnalysisCommand(
              () =>
                pe.inspect(
                  {
                    path: resolve(args.path),
                    max_file_bytes: options.maxFileBytes,
                    max_entries: options.maxEntries,
                  },
                  { signal },
                ),
              pe,
              "rea-pe-resources",
              "inspect_pe_resources",
            ),
        );
      }),
  });
  registerPriResourcesCommand(cli, logger);
  const service = createBinaryLayoutService(environment);
  cli.command(CLI_COMMANDS.inspectBinaryLayout, {
    description:
      "Inspect binary file/linked layout without executing the selected object",
    args: z.object({
      path: z.string().describe("Local ELF binary or relocatable object"),
    }),
    run: ({ args }) =>
      withCommandCancellation((signal) =>
        logCliCommand(logger, CLI_COMMANDS.inspectBinaryLayout, async () => {
          const result = await service.inspectAndClose(
            { path: resolve(args.path) },
            { signal },
          );
          return result.ok ? result.value : projectAnalysisError(result.error);
        }),
      ),
  });
  const recorded = createRecordedCrashService(environment);
  cli.command(CLI_COMMANDS.inspectRecordedCrash, {
    description:
      "Inspect supplied core registers/signals and optional debugger mapping evidence",
    args: z.object({
      path: z
        .string()
        .describe("Local Linux ELF64 amd64 or AArch64 little-endian core"),
    }),
    options: z.object({
      debuggerContext: z
        .boolean()
        .default(false)
        .describe("Add BYO core-only GDB/pwndbg mapping candidates"),
    }),
    run: ({ args, options }) =>
      withCommandCancellation((signal) =>
        logCliCommand(logger, CLI_COMMANDS.inspectRecordedCrash, async () => {
          const result = await recorded.inspectAndClose(
            {
              path: resolve(args.path),
              include_debugger_context: options.debuggerContext,
            },
            { signal },
          );
          return result.ok ? result.value : projectAnalysisError(result.error);
        }),
      ),
  });
};
