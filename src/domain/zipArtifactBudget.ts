/** Bound the single central-directory allocation performed by the ZIP parser. */
export const ZIP_METADATA_READ_MAX_BYTES = 8 * 1024 * 1024;

/** Bound parsed entries and retained reader identities per ZIP traversal. */
export const ZIP_MAX_ENTRIES_PER_TRAVERSAL = 4_096;
