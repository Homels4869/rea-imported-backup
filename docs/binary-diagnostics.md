# Offline binary diagnostics

`inspect_binary_layout` / `inspect-binary-layout` answers what an explicit
file contains: section/segment layout, original symbols/relocations, static
linkage names and mitigation indicators. It works without an active Hopper,
Ghidra or IDA target. CTF is one possible use; crash triage, compatibility and
ordinary binary inspection use the same modular capability.

## Bring your own engine

Initial real verification covers **Linux x64, ELF64 x86-64 little-endian
EXEC/DYN/REL**. Provide an absolute Python executable whose environment already
contains unchanged pwntools 4.15.0, pyelftools 0.33 and Unicorn 2.1.2:

```sh
REA_PWNTOOLS_PYTHON=/absolute/isolated-env/bin/python \
  rea inspect-binary-layout ./selected.elf --json
```

```json
{
  "name": "inspect_binary_layout",
  "arguments": { "path": "/artifacts/selected.elf" }
}
```

REA never installs Python, packages or GDB, changes a user init file, launches
the selected object as a host process, or requests runtime library resolution. The Python process
uses isolated mode and an owned cache. Exact upstream profiles are recorded in
[upstream provenance](https://github.com/morluto/rea/blob/main/third_party/pwntools/README.md).

## Interpreting results

- Artifact path, SHA-256 and size identify original selected bytes. All parsing
  reads an owned stable snapshot; the original is unchanged.
- Addresses, offsets, lengths and flags are hexadecimal strings. A linked
  address is not a runtime address. Runtime load base remains null. A zero
  EXEC/DYN entry means absent; a relocatable entry is not applicable.
- Each symbol retains its table and entry index. Its reported value can mean
  undefined, alignment, absolute value, no address, unknown section index,
  section offset, TLS offset or linked virtual address. Duplicate names remain
  separate entries. SHN_XINDEX remains unresolved in the selected upstream
  representation; its external index table is not silently treated as resolved.
- Relocatable objects have section-relative relocations and no executable entry
  claim. Signed REL/RELA relocation addends are decimal strings. Packed RELR
  tables retain full original bytes and upstream-decoded offsets as derived
  evidence, with per-offset packed-word locations and implicit addends unknown.
  Overall relocation inventory completeness remains unknown.
  A relocatable SHN_UNDEF target or inactive SHT_NULL header remains an explicit
  unknown with the original reported section index and offset.
- REL/RELA symbol references retain their original table and entry indices.
  Positive indices resolve through a validated symbol table; symbol index zero
  means a zero symbol value without a table lookup, including when no table is
  linked. Malformed references fail with the affected section and symbol index.
- Section-name and symbol tables require declared SHT_STRTAB links.
  SHN_UNDEF explicitly means no section names: display is empty, raw name and
  location unknown, with the original name offsets retained. Extended section-name
  indices resolve through section zero and undergo the same validation.
- Symbol tables require a declared SHT_STRTAB link. Name offsets and terminators
  must stay inside the declared string table; malformed references fail before
  unrelated bytes can become names. Dynamic dependencies use DT_STRTAB/DT_STRSZ
  with a unique file-backed mapping; ambiguous or unbacked mappings are
  explicitly unsupported.
- Name display strings use UTF-8 replacement for opaque bytes, including
  sectionless dependency names and interpreter paths. Raw name
  bytes and string-table ranges retain observed identity where resolvable;
  ranges include the terminating NUL and base64 bytes exclude it.
- NOBITS and NULL sections provide no file bytes. Reported file-backed ranges
  are checked against snapshot size again at the public boundary. PT_NULL payload
  fields are unused: reported numbers remain, file backing is none and interpreted
  permissions are null. Segments with zero file size also have no file bytes.
- Sectionless dynamic images still report dependency names with raw bytes and
  file locations where uniquely mapped. Missing symbol/relocation section tables
  do not establish that those runtime tables are absent.
  Upstream RELRO/canary heuristics rely on sections and can be incomplete in
  this case; their reported candidates retain an explicit coverage limitation.
- DT_NEEDED/PT_INTERP are reported names, not resolved runtime paths. GOT/PLT
  maps are derived convenience views and may collapse aliases. PLT inference
  can emulate selected instructions in Unicorn; its outputs are static candidates.
  Exec syscall tracing observes host process launches. Map completeness
  remains unknown and original upstream warnings are returned inline.
- Canary, PIE, NX, executable-stack and RELRO are static inferences. NX and
  executable-stack are separate upstream indicators: on x86-64 an executable
  stack can accompany an unknown (`null`) NX indicator. ET_DYN can be a shared
  library, and an absent canary symbol does not prove every function unprotected.

When complete layout Evidence is already retained, `inspect_analysis_view` /
`inspect-analysis-view` projects a summary, the mitigations or linkage facet,
one section or symbol, or a stable page without re-running the decoder. CLI
one-shot invocations pass portable inline Evidence JSON; an MCP session uses
the retained `evidence_id`. Page `limit` is required and bounded by the
measured MCP stdio budget documented on the tool contract.

Over MCP, `inspect_binary_layout` with `"detail": "summary"` retains the
complete layout Evidence in the session and returns only its summary view.
Its `normalized_result.parent_evidence_id` names the retained layout for later
section, symbol, mitigation or linkage views. The default `complete` detail and
CLI output are unchanged.

Complete results have a 32 MiB input, 64 MiB reply, 1 MiB combined diagnostics
and 30-second owned command deadline. `REA_PWNTOOLS_MAX_INPUT_BYTES` raises the
input bound alone, up to 1 GiB; the reply and deadline bounds are unchanged. The
reply budget applies to the decoder record; the CLI/MCP Evidence envelope adds
copies and encoding overhead. The
pinned MCP SDK defaults to a 10 MiB receive buffer. Large complete results need
a caller-configured `StdioClientTransport({ maxBufferSize: ... })` and a matching
server `REA_MCP_MAX_RESPONSE_BYTES`. See [MCP delivery budgets](mcp-contracts.md#tool-results).
These settings affect delivery, not decoder coverage or limits. The large
extended-index verification uses 256 MiB and an explicit five-minute request
timeout in its separate opt-in MCP lane. REA does not silently truncate the result. Python lowers resource soft limits to at most 3 GiB virtual address space,
30 CPU seconds and 64 MiB file output. Inherited tighter soft/hard limits are
retained, and the effective values are returned in the result limitations. Virtual address space is not RSS;
Unicorn needs a large virtual map. Limits fail with no partial success, and
owned process/root cleanup completes independently of cancellation.

Core files, GDB session/state/control, optional pwndbg enrichment and instruction
inspection are separate increments tracked by #969. This increment makes no
real support claim for those features or other operating systems/architectures.

Typed decoder failures retain bounded `captured_output` (stdout, stderr and an
explicit truncation flag) alongside the original failure category and reason.
Successful `diagnostics` also exposes the supervisor's `truncated` flag. Output
beyond the complete diagnostic budget is rejected, including when the decoder
writes a valid reply; cleanup and late cancellation reuse the observed flag.
Memory allocation failures use `resource_constraint`, with effective resource
limits (or an explicit unknown) and memory-specific recovery guidance. A
MemoryError alone does not establish the exact failed allocation or that a
particular budget was exhausted. Invalid undersized symbol entries are rejected
before REA reports source ranges for them.
The bridge reserves 1 MiB to report allocation failures. If even error reporting
or serialization fails with MemoryError, its reserved exit status preserves the
resource classification with unknown effective limits.
Reserved exits require a matching private marker written by the bridge's actual
failure branch. Bare launcher exits or missing/unwritable markers retain process
diagnostics with the resource cause unverified.
Signal termination alone is never classified as observed memory exhaustion.
The small bootstrap also covers catchable MemoryError during adapter imports,
compilation and initialization. Python interpreter startup failures before the
bootstrap runs retain their observed process diagnostics without guessed causes.
SIGXCPU retains a CPU resource diagnostic and CPU-specific recovery advice.
Observed EFBIG writes or SIGXFSZ termination retain a file-size resource
diagnostic and file-size-specific recovery advice. If a tight file limit also
prevents writing the limit record, effective values remain unknown.
The bridge records actual limits in owned storage before analysis; missing or
malformed limit reports remain unknown with their read failure preserved. A
received signal alone does not establish its exact cause. Dynamic tags require
a complete DT_NULL inside PT_DYNAMIC; interpreter names and ranges end at the
first NUL, with any padding still represented by the original segment range.

## Portable PE resources

`inspect_pe_resources` / `inspect-pe-resources` inspects an explicit PE32 or
PE32+ file without an active target, native engine, Python, or Windows SDK:

```sh
rea inspect-pe-resources ./selected.exe --json
```

```json
{
  "name": "inspect_pe_resources",
  "arguments": { "path": "/artifacts/selected.exe" }
}
```

The complete Evidence identifies the stable artifact snapshot by path, byte
count and SHA-256. Resources retain separate type, name and language identities:
numeric IDs are distinct from UTF-16 names, whose original bytes are also
reported. Directory headers, entries, data entries and payloads retain original
file offsets and lengths. Each opaque payload has its own SHA-256; code page and
reserved data-entry fields are preserved.

RT_GROUP_ICON records expose original image descriptors and RT_ICON candidates.
A reference resolves only when an icon with the same numeric ID and language
exists. Missing references, other-language candidates and declared-size mismatch
remain explicit. Encoded dimensions are preserved (zero denotes 256 pixels).
This is static reference inspection; no image decoding, language fallback,
resource loading or selected-file execution occurs.

An absent resource data directory is a complete empty inventory. Malformed
headers, truncated tables, cycles, duplicate sibling identities, unbacked or
ambiguous RVA mappings, nonidentical overlapping ranges and unsupported tree
shapes fail explicitly, rather than returning partial inventories. Exact shared
payload ranges are supported. The supported tree has three levels: type, name,
and language. Other resource payload formats remain opaque.

`max_file_bytes` defaults to 64 MiB (maximum 512 MiB); `max_entries` defaults to
16384, the largest stock Windows resource image measured with headroom
(maximum 65536). CLI options are `--max-file-bytes` and `--max-entries`.
Metadata is bounded to 8 MiB; exceeding any budget fails without truncation.
Large Evidence envelopes may require a caller-configured MCP transport receive
buffer because envelope copies add overhead. Requests honor cancellation during
snapshot reading, directory traversal and payload hashing. The operation reads
regular files only and rejects symbolic links.

## Portable PRI resource indexes

`inspect_pri_resources` / `inspect-pri-resources` reads an explicit Windows
Package Resource Index (`.pri`), the MRM index that MSIX, UWP and WinUI apps use
for UI strings and qualified assets. It needs no active target, engine, Windows
SDK or network access, and it never executes the package:

```sh
rea inspect-pri-resources ./resources.pri --json
rea inspect-pri-resources ./resources.pri --collection candidates \
  --query Resources/ --qualifier Language=en-US --json
```

```json
{
  "name": "inspect_pri_resources",
  "arguments": {
    "path": "/artifacts/resources.pri",
    "collection": "candidates",
    "names": ["Resources/AppDisplayName"]
  }
}
```

Every response identifies the stable snapshot by path, byte count and SHA-256
and summarizes the header, footer, section kinds, resource maps (schema name,
version and checksum, top-level scopes), the stored qualifier values and the
candidate count per stored value type. It then returns one page of a selected
collection:

- `items` (default): named resources with full names such as
  `Resources/AppDisplayName` or `Files/Assets/Logo.png`, their decision and
  candidate counts. An item with no candidates in this file has a `null`
  decision; resource packs and other PRI files may supply its values.
- `candidates`: each candidate's qualifier set and qualifiers, stored value type
  and source (data item, inline map data or referenced file) with its original
  file range. `String`, `Path` and their ASCII and UTF-8 variants are decoded;
  invalid encodings or a missing terminator set `well_formed: false` and keep
  the decoded text with U+FFFD replacements. `EmbeddedData` and unknown value
  types report a SHA-256 instead of inline bytes.
- `sections`: the complete section table with identifiers, qualifiers, flags,
  file ranges and whether REA interpreted each section.
- `qualifiers`: the stored qualifier table with priorities and fallback scores
  (stored in thousandths; makepri prints them divided by 1000).

`names` match full names exactly; `query` is a case-insensitive substring.
`qualifiers` keeps candidates whose qualifier set carries one of the listed
values (ASCII case-insensitive) for every listed qualifier name; candidates
without that qualifier do not match. `value_types` selects stored types, so
select `String`, `AsciiString` and `Utf8String` for all text. Selectors apply
to items and candidates only. Rows keep item and candidate-table order;
`page.total` counts every match and `page.next_offset` continues a page that
ended at `limit` (default 100, maximum 1000) or at its 1 MiB serialized-row
budget. MRT runtime qualifier resolution and fallback are not simulated.

Qualifier type names follow the format generation: `mrm_pri0` and `mrm_pri1`
store Configuration as code 6, while `mrm_pri2` stores Theme there and adds
Configuration, DeviceFamily and Custom as codes 9-11. The `mrm_prif` table is
not established, so its qualifiers are named `Unknown` with their `type_code`.

The container, descriptor, hierarchical schemas (`[def_hnames]` and
`[def_hnamesx]` names tables), decision tables, resource maps (including large
item tables and inline values) and data item tables are cross-checked; bad
magic, truncation, out-of-range or partially overlapping ranges, inconsistent
counts and invalid structural names fail without a partial result.
`[mrm_rev_map]`, `[def_file_list]` and unrecognized sections are reported but
not interpreted. Values stored in referenced files, environment references and
hierarchical schema references stay explicit unknowns.

`max_file_bytes` defaults to 64 MiB (maximum 512 MiB). Structural names and
qualifier values are bounded to 16 Mi decoded code units, decision tables to
1,048,576 expanded entries and the result to 8 MiB; exceeding a budget fails
without a partial result. Text values longer than 65,536 code units return a
`truncated` prefix with `well_formed: null`. Requests honor cancellation while
decoding and hashing.
