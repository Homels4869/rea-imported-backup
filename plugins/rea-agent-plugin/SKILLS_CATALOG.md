# REA Skills Catalog

**Inventory:** 75 skills total: 2 foundational skills and 73 specialist skills.

Each linked skill has activation criteria, a domain-specific procedure, verification guidance, expected deliverable, and guardrails. A skill name is not evidence that a provider is installed or a runtime check has passed.

## Task intake and collaboration

- [`agent-orchestration`](./skills/agent-orchestration/SKILL.md) — Coordinate specialist passes for REA tasks without confusing role prompts with actual spawned agents.
- [`task-intake`](./skills/task-intake/SKILL.md) — Turn a vague REA request into a small, testable and reviewable task contract.
- [`issue-triage`](./skills/issue-triage/SKILL.md) — Classify a REA issue with evidence and identify the shortest useful next action.
- [`reproduction-design`](./skills/reproduction-design/SKILL.md) — Create a minimal, deterministic reproduction for a reported REA behavior.
- [`hypothesis-led-debugging`](./skills/hypothesis-led-debugging/SKILL.md) — Investigate a REA defect by testing ranked causal hypotheses rather than guessing.
- [`evidence-led-investigation`](./skills/evidence-led-investigation/SKILL.md) — Separate confirmed observations, interpretations, and unknowns in a REA analysis report.
- [`impact-analysis`](./skills/impact-analysis/SKILL.md) — Map the likely blast radius of a proposed REA change before editing.
- [`acceptance-criteria`](./skills/acceptance-criteria/SKILL.md) — Translate a REA request into measurable pass/fail conditions.
- [`dependency-audit`](./skills/dependency-audit/SKILL.md) — Assess dependency relevance, maintenance risk, license, footprint, and supply-chain impact.

## Architecture and implementation contracts

- [`architecture-map`](./skills/architecture-map/SKILL.md) — Build a concise, source-grounded map of a REA workflow across layers.
- [`module-boundary-audit`](./skills/module-boundary-audit/SKILL.md) — Check whether a proposed change respects REA module ownership and dependency boundaries.
- [`dependency-direction-audit`](./skills/dependency-direction-audit/SKILL.md) — Find reverse dependencies and accidental coupling in a REA change.
- [`source-dataflow`](./skills/source-dataflow/SKILL.md) — Trace a value from input parsing to its final REA consumer without reinterpreting it twice.
- [`call-graph-analysis`](./skills/call-graph-analysis/SKILL.md) — Construct a call graph for the requested REA workflow or authorized target program.
- [`public-api-change`](./skills/public-api-change/SKILL.md) — Evaluate compatibility and migration impact before changing a public REA contract.
- [`error-contract-review`](./skills/error-contract-review/SKILL.md) — Keep REA errors stable, meaningful, and consistent across layers.
- [`domain-model-review`](./skills/domain-model-review/SKILL.md) — Check that REA domain types represent real states and invariants without ambiguous flags.
- [`performance-investigation`](./skills/performance-investigation/SKILL.md) — Measure a REA hot path and identify the bottleneck before optimizing.
- [`cache-invalidation-review`](./skills/cache-invalidation-review/SKILL.md) — Verify that REA caches key the right inputs and cannot restore stale derived results.
- [`concurrency-review`](./skills/concurrency-review/SKILL.md) — Audit races, ownership, lock scope, and cleanup for concurrent REA operations.
- [`resource-lifecycle-review`](./skills/resource-lifecycle-review/SKILL.md) — Check that files, processes, devices, sessions, and temporary artifacts have clear ownership and cleanup.

## Static reverse engineering

- [`binary-identification`](./skills/binary-identification/SKILL.md) — Identify a binary's likely file type, architecture, container, and analysis prerequisites.
- [`file-format-inspection`](./skills/file-format-inspection/SKILL.md) — Inspect a supported file format's structural fields while preserving byte offsets and uncertainty.
- [`metadata-inventory`](./skills/metadata-inventory/SKILL.md) — Produce an inventory of metadata REA or an authorized target actually exposes.
- [`string-analysis`](./skills/string-analysis/SKILL.md) — Use extracted strings as leads while distinguishing literal evidence from inferred program behavior.
- [`disassembly-review`](./skills/disassembly-review/SKILL.md) — Review disassembly with attention to architecture, function boundaries, and decoding uncertainty.
- [`decompilation-review`](./skills/decompilation-review/SKILL.md) — Interpret decompiler output without confusing recovered structure with source-level intent.
- [`cross-reference-analysis`](./skills/cross-reference-analysis/SKILL.md) — Use cross-references to link functions, data objects, and behavior in a supported target.
- [`symbol-analysis`](./skills/symbol-analysis/SKILL.md) — Evaluate names and symbol tables as evidence for function and data identification.
- [`debug-symbol-review`](./skills/debug-symbol-review/SKILL.md) — Determine what debug symbols can support and what source mappings remain uncertain.
- [`control-flow-analysis`](./skills/control-flow-analysis/SKILL.md) — Map meaningful branches, loops, exceptions, and exits in a source or authorized binary path.
- [`dataflow-analysis`](./skills/dataflow-analysis/SKILL.md) — Trace how inputs influence outputs, state changes, and security-relevant operations.
- [`static-deobfuscation-review`](./skills/static-deobfuscation-review/SKILL.md) — Simplify ordinary static transformations to make authorized code structure easier to inspect.
- [`archive-inspection`](./skills/archive-inspection/SKILL.md) — Inspect archive entries safely, including paths, sizes, metadata, and nested formats.
- [`compression-analysis`](./skills/compression-analysis/SKILL.md) — Assess standard compression behavior, ratios, limits, and corruption handling.

## Runtime, providers, and safety

- [`target-authorization-review`](./skills/target-authorization-review/SKILL.md) — Establish scope and permission boundaries before any analysis that affects a target.
- [`execution-safety-review`](./skills/execution-safety-review/SKILL.md) — Review side effects and containment before a workflow runs code or attaches to a process.
- [`runtime-observation-plan`](./skills/runtime-observation-plan/SKILL.md) — Design a minimum, bounded runtime experiment to answer one behavior question.
- [`process-lifecycle-audit`](./skills/process-lifecycle-audit/SKILL.md) — Check process start, attach, wait, exit, signal, and teardown behavior in REA.
- [`cancellation-cleanup-audit`](./skills/cancellation-cleanup-audit/SKILL.md) — Verify that cancelled REA operations settle predictably and release owned resources.
- [`resource-bounds-audit`](./skills/resource-bounds-audit/SKILL.md) — Ensure REA work on files, processes, devices, and provider outputs is bounded.
- [`provider-readiness-check`](./skills/provider-readiness-check/SKILL.md) — Determine whether a real analysis provider is installed and usable in the current environment.
- [`provider-adapter-design`](./skills/provider-adapter-design/SKILL.md) — Design a provider adapter that keeps provider-specific behavior behind its canonical boundary.
- [`provider-capability-matrix`](./skills/provider-capability-matrix/SKILL.md) — Compare providers based on verified capability evidence rather than feature-name assumptions.
- [`external-tool-discovery`](./skills/external-tool-discovery/SKILL.md) — Research an external analysis tool before making it a REA integration candidate.

## CLI, MCP, configuration, and privacy

- [`cli-contract-review`](./skills/cli-contract-review/SKILL.md) — Keep REA CLI arguments, stdout/stderr, exit codes, and cancellation behavior predictable.
- [`mcp-tool-design`](./skills/mcp-tool-design/SKILL.md) — Design a narrow, typed MCP tool with predictable inputs, outputs, errors, and side effects.
- [`cli-mcp-parity`](./skills/cli-mcp-parity/SKILL.md) — Ensure CLI and MCP entry points reuse the same domain behavior and differ only at presentation boundaries.
- [`schema-drift-audit`](./skills/schema-drift-audit/SKILL.md) — Detect divergence between authored schema, generated catalog, runtime schema, and documentation.
- [`config-validation`](./skills/config-validation/SKILL.md) — Check that REA configuration parsing has safe defaults and precise errors.
- [`logging-redaction-review`](./skills/logging-redaction-review/SKILL.md) — Ensure REA logs help diagnose failures without exposing secrets or protocol data.

## Testing and performance verification

- [`unit-test-design`](./skills/unit-test-design/SKILL.md) — Design focused unit tests around one REA invariant and its meaningful edge cases.
- [`regression-test-design`](./skills/regression-test-design/SKILL.md) — Make a test fail for the reported defect before verifying the fix.
- [`integration-test-selection`](./skills/integration-test-selection/SKILL.md) — Choose the smallest test layers covering the entire changed REA boundary.
- [`provider-independent-test-design`](./skills/provider-independent-test-design/SKILL.md) — Test shared REA behavior deterministically without a licensed external provider.
- [`golden-evidence-review`](./skills/golden-evidence-review/SKILL.md) — Validate golden fixtures and evidence artifacts for accuracy, provenance, stability, and minimal disclosure.
- [`flaky-test-triage`](./skills/flaky-test-triage/SKILL.md) — Investigate intermittent REA test failures without masking real defects.
- [`test-discovery-audit`](./skills/test-discovery-audit/SKILL.md) — Check whether REA test selection discovers all relevant tests for a changed source path.
- [`temp-file-hygiene`](./skills/temp-file-hygiene/SKILL.md) — Ensure REA-owned temporary files and directories are awaited, bounded, and cleaned up on every path.
- [`coverage-gap-analysis`](./skills/coverage-gap-analysis/SKILL.md) — Identify untested behavior that matters to a specific REA change.
- [`benchmark-design`](./skills/benchmark-design/SKILL.md) — Create repeatable REA performance measurements that compare equivalent work.

## Docs, packaging, review, and handoff

- [`docs-change-workflow`](./skills/docs-change-workflow/SKILL.md) — Update REA docs where the owning implementation or contract actually lives.
- [`installation-debugging`](./skills/installation-debugging/SKILL.md) — Trace REA installation failures through versions, packaging, PATH, native artifacts, and provider prerequisites.
- [`example-consistency-review`](./skills/example-consistency-review/SKILL.md) — Keep README, docs, templates, and examples aligned with actual REA interfaces.
- [`package-verification`](./skills/package-verification/SKILL.md) — Verify a REA release package includes required files and excludes development-only or sensitive artifacts.
- [`release-readiness-review`](./skills/release-readiness-review/SKILL.md) — Assess whether a REA release has evidence for compatibility, packaging, docs, and publishing prerequisites.
- [`changelog-drafting`](./skills/changelog-drafting/SKILL.md) — Draft user-facing REA release notes from verified changes and repository conventions.
- [`code-review`](./skills/code-review/SKILL.md) — Review a REA diff for correctness, contract drift, tests, scope, and maintainability without editing it.
- [`security-boundary-review`](./skills/security-boundary-review/SKILL.md) — Evaluate execution, mutation, access, and protection-related behavior against REA contribution policy.
- [`privacy-review`](./skills/privacy-review/SKILL.md) — Reduce sensitive data exposure in REA output, logs, fixtures, and reports.
- [`dependency-change-review`](./skills/dependency-change-review/SKILL.md) — Review a package/lockfile diff for reproducibility, support, and supply-chain effects.
- [`git-branch-handoff`](./skills/git-branch-handoff/SKILL.md) — Prepare an isolated, reviewable branch handoff without disturbing the user's working tree.
- [`pr-readiness-handoff`](./skills/pr-readiness-handoff/SKILL.md) — Prepare an accurate draft PR summary while preserving human readiness declarations.

## Foundational skills

- [`reverse-engineer-anything`](./skills/reverse-engineer-anything/SKILL.md) — Evidence-first software investigation for authorized targets.
- [`rea-repository-contributor`](./skills/rea-repository-contributor/SKILL.md) — Safe, scoped contribution workflow for the REA repository.

## Selection rules

1. Start with `task-intake` or `issue-triage` when the outcome is unclear.
2. Load only skills relevant to the current task; do not paste the entire catalog into every prompt.
3. Begin with read-only architecture, security/scope, and performance review where appropriate.
4. Add regression, provider-independent, and integration testing skills when behavior changes.
5. Use `pr-readiness-handoff` for status-accurate handoff; readiness remains human-owned.
