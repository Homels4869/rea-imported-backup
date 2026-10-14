import { z } from "zod";

/** Provider-reported diagnostics; silence does not prove complete decompilation. */
export const decompilerCompletenessSchema = z
  .strictObject({
    status: z.enum(["warnings", "no-warnings-reported", "unavailable"]),
    provenance: z.string().min(1),
    warning_count: z.number().int().nonnegative(),
    warnings: z.array(z.string().min(1)),
    diagnostic: z.string().min(1).nullable(),
    dropped_blocks: z.array(
      z.strictObject({
        start: z.string().min(1).nullable(),
        end: z.null(),
        address_space: z.string().min(1),
        reported_offset: z.string().min(1).nullable().default(null),
        reason: z.literal("unreachable"),
        warning_index: z.number().int().nonnegative(),
      }),
    ),
    disassembly_available: z.boolean(),
  })
  .superRefine((value, context) => {
    const warned = value.warnings.length > 0 || value.diagnostic !== null;
    if (
      value.warning_count !== value.warnings.length ||
      (value.status === "warnings") !== warned ||
      value.dropped_blocks.some(
        (block) => block.warning_index >= value.warnings.length,
      )
    )
      context.addIssue({
        code: "custom",
        message: "Decompiler diagnostic counts or status are inconsistent",
      });
  });

/** Inline qualifications for consumers of decompiler-derived dossier facts. */
export const decompilerObservationLimitations = (
  observation: z.infer<typeof decompilerCompletenessSchema> | undefined,
): string[] => {
  if (observation === undefined) return [];
  return [
    ...(observation.status === "unavailable"
      ? ["Decompiler output is unavailable for this function."]
      : []),
    ...observation.warnings.map((text) => `Decompiler warning: ${text}`),
    ...(observation.diagnostic === null
      ? []
      : [`Decompiler diagnostic: ${observation.diagnostic}`]),
  ];
};
