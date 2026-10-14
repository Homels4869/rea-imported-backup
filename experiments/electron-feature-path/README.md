# Electron feature-path experiment

This is a small, unregistered prototype pending a maintainer scope decision under
[CONTRIBUTING.md](../../CONTRIBUTING.md#fail-closed-integration). It is not included
in REA's runtime build or package and adds no CLI/MCP tools or target injection.
The supplied fixture explicitly installs probes around its own selected main IPC
handler and `fs.promises.writeFile` calls. Do not inject it into another app.

The analyst question is: **which selected file-write call occurred in the async
context of this main IPC invocation?** Existing Electron capture records action,
IPC and lifecycle events, but does not recover renderer/preload execution or a
handler-to-filesystem relation. This experiment tests that missing relation before
proposing a production authority or instrumentation contract.

## Observed boundary

`createRecorder` validates an explicit channel/path selection and caller-selected
retention estimate budget. `wrapHandler` and `wrapFileWriter` return tagged
success/failure results; the caller owns installation and the bound operations.
There are no global patches to restore and no process ownership in the recorder.
The existing REA capture provider owns the fixture's launch and cleanup.

Each invocation and file effect receives a recorder-local ID. Ordered start and
return/settlement records retain literal channels, selected paths and the raw
wrapper-installation call site. They do not capture payloads or the environment.
Sync results, original Promise objects, exceptions, receivers and arguments pass
through. Unselected operations and FileHandle/URL/Buffer inputs pass through
without being claimed as observed file effects.

`within_handler` is `true` while observed handler lifetime is active, `false`
after observed completion (or outside a handler), and `null` when completion
cannot be observed. Detached callbacks retain their invocation lineage; that
lineage does not prove a business cause or a UI association. Opaque thenables
are not inspected. Promise completion observation can read constructor/species
and affect unhandled-rejection reporting. Failed observer installation preserves
the original return and marks lifetime unknown.

Coverage counts examined, retained and dropped probe events. Selection strings,
fixed metadata and escaped-string expansion participate in admission before event
serialization/copying. The budget is a conservative retention estimate, not a
process-memory ceiling. A snapshot allocates another bounded copy. Missing events
remain truncation; `selected-probes-retained` never claims all application activity.
The experimental JSON contract validates selection, counts and ordering. It is
not authenticated canonical REA Evidence and must not be imported as such.

## Run

Use the repository's pinned Node/npm and existing locked dependencies. Build the
normal runtime first, then supply your own Electron executable. The verifier
accepts only a new absolute output directory and preserves its artifacts.

```sh
nvm use
npm run build:cached
node --test experiments/electron-feature-path/*.test.mjs
node experiments/electron-feature-path/verify-mcp.mjs \
  --electron /absolute/path/to/Electron \
  --output /absolute/path/to/new-prototype-output
```

The verifier uses actual stdio MCP discovery and validates advertised input/output
schemas and canonical Evidence. It analyzes the fixture, traces the literal IPC
channel, captures clicks through `capture_electron_scenario`, and compares the
experimental trace to the resulting file. A second explicit IPC round trip and a
visible UI barrier flush observations after the export handler; no sleep is used
to infer that relation. Source bytes are checked before and after the run.
Complete canonical Evidence is exported alongside the raw MCP replies; the
experimental trace has a separate digest and authority. Cancellation requests
are relayed to the observed JSON-RPC request ID. The MCP server suppresses the
cancelled request's final reply, so cancellation uses an independent
`close_binary` admission-drain acknowledgement followed by REA's process ownership
check against the fixture's explicit run-token receipt and a prelaunch identity
baseline. Neither a missing reply nor a drain acknowledgement alone proves
cleanup. Unrelated unreadable processes remain explicit in the ownership result.
Only that dedicated ownership token is recorded, not the ambient environment.
Uncertain cleanup keeps the verifier and server owned rather than force-closing
them. Bounded stderr includes complete/truncated accounting.

Exercise real cancellation after the fixture acknowledges readiness with another
new directory and `--cancel-after-ready`. The verifier deliberately waits on a
missing button, sends cancellation, and checks the independent cleanup proof;
it never manufactures a canonical tool error or a partial capture reply.

For an equivalent output-producing baseline with the experiment's wrappers
disabled, run with a different new output directory and `--baseline`. Both modes
still use REA's existing Electron main hook. Compare completed tasks rather than
record counts; this baseline does not offer the new invocation/effect relation.

## Verification and integration decision

Tests cover concurrent same-channel invocations, return/error identity, opaque
completion, detached work, selected boundaries, metadata/event retention and
malformed experimental data. The real fixture must establish source identity,
actual IPC/file behavior, coexistence with the existing main hook, and verified
owned-process cleanup. Node-only callback tests do not establish Electron behavior.

Before production integration, maintainers must decide the selected targets,
probe-installation mechanism, effects, compatibility, resource and cleanup
verification. Renderer/preload source locations and execution, cross-process
invocation identity, native calls and arbitrary application compatibility remain
unimplemented. Matching static channel names or temporal adjacency does not
bridge these gaps. A production result would need per-edge Evidence authority and
unknowns rather than presenting this partial relation as a complete execution path.

## Local verification record

On macOS arm64, Node 24.18.0 and caller-supplied Electron 44.4.3, the real compiled
CLI and stdio MCP fixture runs produced the expected file and reported
`terminated-owned-process`. The cancellation lane independently drained the
session and verified token-owned process absence, preserving unrelated unreadable
process observations. The earlier cancellation experiment exposed the SDK's
suppressed-reply behavior; it is not counted as a passing cleanup test.

The prototype has 40 passing Node tests, including an actual installed MCP SDK
cancellation test. Existing Electron CLI/MCP/main-hook boundary tests contribute
another 16 passing cases. These results do not establish other Electron versions,
Linux/Windows, arbitrary applications, renderer/preload execution or native calls.

The following completed-task measurements use the same fixture and four normal
MCP calls (static summary, channel trace, capture, bundle export), including full
catalog discovery/schema validation. The baseline disables only the experimental
wrappers and produces the same file; it cannot report the new relation.

| Mode                      | Elapsed s | Reported CPU s | Sampled family RSS MiB | Payload token estimate |
| ------------------------- | --------: | -------------: | ---------------------: | ---------------------: |
| Baseline, first measured  |      5.82 |           6.80 |                  1,316 |              1,092,800 |
| Prototype, first measured |      4.85 |           6.29 |                  1,476 |              1,092,789 |
| Baseline, repeated        |      5.02 |           6.40 |                  1,484 |              1,092,802 |
| Prototype, repeated       |      4.82 |           6.15 |                  1,589 |              1,092,791 |
| Cancellation proof        |      5.07 |           6.25 |                  1,487 |             Unmeasured |

Every run starts fresh Node/MCP/Electron processes and a new profile. Repeats may
benefit from OS file caches; true OS-cold and warm-result-cache runs are unmeasured.
CPU is `wait4` user+system accounting; descendant accumulation depends on OS/reaping.
Memory is the sampled sum of family RSS at about 30 ms plus process-table-read
time: shared pages count in each process and short peaks can be missed. It is an
estimate, not a unique-resident or hard-limit measurement. `tokenx` estimates
serialized catalog plus request/reply payloads, including both tool-result
representations. The unchanged catalog alone estimates 974,705 tokens; actual
agent rendering/billed tokens are unmeasured and the verifier uses no model.
Single samples and differing capture metadata do not establish a speed, memory,
or token improvement or a general upper bound on instrumentation overhead.
