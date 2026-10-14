/** Raw coordinates are independent of WHATWG's normalized origin and pathname. */
export interface RecordedTransportUrl {
  readonly origin: string | null;
  readonly path: string | null;
  /** WHATWG query spelling, present only when explicitly selected for projection. */
  readonly query?: string;
  readonly credentials:
    | { readonly start: number; readonly end: number }
    | "ambiguous"
    | null;
  /** Safe network reference when relative userinfo has no reliable raw span.
   * Its absent scheme/origin is not supplied by the temporary parsing base. */
  readonly credentialFreeReference?: string;
}

/**
 * Interpret transport URL syntax once for credential exclusion and recorded-path
 * projection. Never use URL.pathname: it removes observed dot segments.
 * Noncanonical spellings may have parsed credentials but no safe raw span.
 */
export const parseRecordedTransportUrl = (
  value: string,
  options: { readonly includeQuery?: boolean } = {},
): RecordedTransportUrl => {
  const absolute = URL.parse(value);
  const slashPrefix = /^[\x00-\x20]*(?:([A-Za-z][A-Za-z0-9+.-]*):)?\/\//u.exec(
    value,
  );
  // Keep absolute raw-path admission unchanged. Relative network references
  // may mix both special-URL separators; a single separator remains path data.
  const prefix =
    absolute === null
      ? (/^[\x00-\x20]*[/\\]{2,}/u.exec(value) ?? slashPrefix)
      : slashPrefix;
  // Resolve references only to recognize credentials (including WHATWG's
  // backslash/control-character spellings), never to supply a projected origin.
  const parsed = absolute ?? URL.parse(value, "https://rea.invalid");
  const hasCredentials =
    parsed !== null && (parsed.username !== "" || parsed.password !== "");
  const origin =
    absolute !== null && absolute.origin !== "null" ? absolute.origin : null;
  if (prefix === null) {
    const credentials = hasCredentials ? "ambiguous" : null;
    return {
      origin,
      path: null,
      credentials,
      ...relativeCredentialFallback(absolute, parsed, credentials),
    };
  }

  const authorityStart = prefix[0].length;
  const protocol =
    parsed?.protocol ?? `${prefix[1]?.toLowerCase() ?? "https"}:`;
  const special = ["ftp:", "file:", "http:", "https:", "ws:", "wss:"].includes(
    protocol,
  );
  let authorityEnd = authorityStart;
  while (
    authorityEnd < value.length &&
    !"/?#".includes(value[authorityEnd]!) &&
    !(special && value[authorityEnd] === "\\")
  )
    authorityEnd += 1;
  const authority = value.slice(authorityStart, authorityEnd);
  const stableAuthority = authority.length > 0 && !/[\t\n\r]/u.test(authority);
  const at = authority.lastIndexOf("@");
  const credentials =
    !stableAuthority && hasCredentials
      ? "ambiguous"
      : at >= 0
        ? { start: authorityStart, end: authorityStart + at + 1 }
        : hasCredentials
          ? "ambiguous"
          : null;
  // Only an explicit, unpadded scheme://authority has a recorded absolute path.
  // Backslashes are authority/path separators for special schemes in WHATWG.
  if (
    origin === null ||
    !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(value) ||
    !stableAuthority ||
    (special && value[authorityEnd] === "\\")
  )
    return {
      origin,
      path: null,
      credentials,
      ...relativeCredentialFallback(absolute, parsed, credentials),
    };
  const query =
    options.includeQuery === true ? { query: absolute!.search } : {};
  if (value[authorityEnd] !== "/")
    return { origin, path: "/", credentials, ...query };
  let pathEnd = authorityEnd;
  while (pathEnd < value.length && !"?#".includes(value[pathEnd]!))
    pathEnd += 1;
  return {
    origin,
    path: value.slice(authorityEnd, pathEnd),
    credentials,
    ...query,
  };
};

const relativeCredentialFallback = (
  absolute: URL | null,
  parsed: URL | null,
  credentials: RecordedTransportUrl["credentials"],
): Pick<RecordedTransportUrl, "credentialFreeReference"> => {
  if (absolute !== null || parsed === null || credentials !== "ambiguous")
    return {};
  parsed.username = "";
  parsed.password = "";
  return { credentialFreeReference: parsed.href.slice(parsed.protocol.length) };
};

/** WHATWG form-query name decoding; preserve order, repeats and empty names. */
export const parseUrlQueryParameterNames = (
  query: string,
): IterableIterator<string> => new URLSearchParams(query).keys();
