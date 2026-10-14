import { z } from "zod";
import { AnalysisOutputError } from "../domain/analysisErrorCore.js";
import { jsonValueSchema } from "../domain/jsonValue.js";
import type { AndroidOperation } from "../domain/android/androidAnalysis.js";
import { dexDescriptorSchema } from "../domain/android/androidAnalysis.js";

const count = z.number().int().nonnegative();
/** Selector failures authored by REA's bridge, separate from arbitrary engine errors. */
export const jadxInputFailureSchema = z.strictObject({
  kind: z.literal("invalid-input"),
  field: z.enum(["class_name", "method_name", "overload_index"]),
  message: z.string().min(1),
});
/** Values observed inside the exact JVM producing the analysis. */
export const jadxRuntimeSchema = z.object({
  engine_reported_version: z.string().min(1),
  max_heap_bytes: z.number().int().positive().safe(),
  available_processors: z.number().int().positive(),
  java_version: z.string().min(1),
  metadata_scope: z.literal("parsed_members"),
});
export const jadxLoadSchema = z.object({
  state: z.literal("LOADED"),
  apk_path: z.string(),
  class_count: count,
  resource_count: count,
  threads: z.literal(1),
  resources: z.literal("full"),
});
export const jadxAppSchema = z.object({
  package: z.string(),
  version_name: z.string(),
  version_code: z.string(),
  min_sdk: z.string(),
  target_sdk: z.string(),
  permissions: z.array(z.string()),
});
export const jadxClassPageSchema = z.object({
  total: count,
  offset: count,
  limit: count,
  items: z.array(z.string()),
});
export const jadxClassSchema = z.object({
  full_name: z.string(),
  name: z.string(),
  method_count: count,
  field_count: count,
  inner_class_count: count,
  methods: z.array(
    z.object({
      name: z.string(),
      signature: z.string(),
      dex_descriptor: dexDescriptorSchema,
      is_constructor: z.boolean(),
      def_pos: z.number().int(),
    }),
  ),
  fields: z.array(
    z.object({ name: z.string(), type: z.string(), def_pos: z.number().int() }),
  ),
  inner_classes: z.array(z.string()),
});
export const jadxMethodSchema = z.object({
  class_name: z.string(),
  method_name: z.string(),
  full_name: z.string(),
  overload_index: count,
  overload_count: count,
  mode: z.enum(["java", "smali"]),
  fell_back: z.boolean(),
  markers: z.array(z.string()),
  body: z.string(),
});
export const jadxXrefsSchema = z.object({
  target: z.string(),
  overload_index: count.optional(),
  reported_signature: z.string().optional(),
  total: count,
  count,
  resolve_line: z.literal(false),
  items: z.array(
    z.object({
      kind: z.string(),
      name: z.string(),
      full_name: z.string(),
      containing_class: z.string(),
      top_class: z.string(),
      def_pos: z.number().int(),
      direct_invokes_exhaustive: z.boolean().optional(),
      direct_invokes: z
        .array(
          z.object({
            dex_entry: z.string().min(1),
            source_raw_method_id: z.string().min(1),
            dex_code_unit_offset: count,
            dex_method_index: count,
            opcode: z.string().regex(/^INVOKE_/u),
          }),
        )
        .optional(),
    }),
  ),
});
const toolResponse = z.object({
  content: z
    .array(z.object({ type: z.literal("text"), text: z.string() }))
    .length(1),
  isError: z.boolean().optional(),
});

/** Parse the upstream text-only envelope, preserving errors at the producing boundary. */
export const parseJadxEnvelope = (
  response: unknown,
  operation: AndroidOperation,
): { text: string; failed: boolean } => {
  const parsed = toolResponse.safeParse(response);
  if (!parsed.success || parsed.data.content[0] === undefined)
    throw new AnalysisOutputError(
      operation,
      "JADX returned an unsupported MCP content envelope",
    );
  return {
    text: parsed.data.content[0].text,
    failed: parsed.data.isError === true,
  };
};

/**
 * HotSpot's two heap-exhaustion reasons, which are the `OutOfMemoryError`
 * messages this provider's remediation does fix: the heap cannot hold the
 * working set, and the collector spends nearly all of its time reclaiming
 * almost none of it. Both are remedied by the same worker heap setting, and a
 * larger heap turns the second into the first rather than into a different
 * failure. Read against the reason rather than the whole text: the bridge
 * composes an upstream failure as "<step> failed: <reason>", and a launcher
 * that dies before the handshake writes the same `OutOfMemoryError` text to
 * stderr. Other `OutOfMemoryError` reasons (native thread, metaspace, direct
 * buffer) are not heap shortages, so they keep the generic adapter failure
 * instead of claiming the heap setting is the fix. A heap below the JVM's own
 * minimum never reaches either path: the VM refuses to initialize and prints
 * its own message.
 */
const JADX_HEAP_EXHAUSTION = /java heap space|gc overhead limit exceeded/iu;

/** Whether the JVM reported heap exhaustion, in a bridge failure or a launcher's retained stderr. */
export const jadxHeapExhausted = (text: string): boolean =>
  JADX_HEAP_EXHAUSTION.test(text);

/** Decode an upstream JSON text payload without trusting its contents. */
export const parseJadxJson = (
  text: string,
  operation: AndroidOperation,
): z.infer<typeof jsonValueSchema> => {
  try {
    return jsonValueSchema.parse(JSON.parse(text));
  } catch (cause) {
    throw new AnalysisOutputError(
      operation,
      "JADX returned malformed JSON text",
      { cause },
    );
  }
};

/** Upstream byte truncation is reported rather than promoted to a complete source. */
export const normalizeJadxText = (
  text: string,
): {
  status: "complete" | "partial";
  text: string;
  reported_total_bytes: number | null;
} => {
  const marker =
    /\n\n\.\.\. \[truncated: exceeds (\d+) bytes, total (\d+) bytes\]$/u.exec(
      text,
    );
  const total = marker?.[2] === undefined ? null : Number(marker[2]);
  return {
    status: marker === null ? "complete" : "partial",
    text,
    reported_total_bytes:
      total !== null && Number.isSafeInteger(total) ? total : null,
  };
};
