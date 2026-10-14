---
name: reverse-engineer-anything
description: Investigate software behavior, dependencies, binary or application structure, and implementation details with REA MCP tools. Use when the user asks to understand how an authorized application or artifact works, trace a feature, inspect dependencies, or recreate compatible behavior based on evidence.
---

# REA — Reverse Engineer Anything

Use REA's MCP tools to investigate software that the user owns or is explicitly authorized to analyze. REA is the evidence-gathering system; you are responsible for planning the investigation, interpreting evidence, implementing only the requested compatible behavior, and testing the result.

## Core rules

1. **Confirm scope and authorization.** Work only on software, devices, traffic captures, and artifacts the user owns or has permission to examine. If ownership or authorization is unclear and materially affects the task, ask before proceeding.
2. **Discover capabilities first.** Use REA's session/discovery tool (for example, `binary_session` with an empty object when appropriate) before selecting operations. Check `tool_availability`, provider requirements, and session state instead of assuming a tool exists.
3. **Start with the narrowest useful target.** Identify the exact app, file, module, feature, version, platform, and question. Prefer static analysis before runtime interaction when it can answer the question.
4. **Gather evidence before conclusions.** Follow imports, references, calls, routes, IPC boundaries, symbols, or data flow as appropriate to the target. Record the evidence that supports each claim.
5. **Separate facts from hypotheses.** Label findings as confirmed, likely, or unknown. Include source locations, symbols, addresses, tool output references, or other available evidence. Never invent pseudocode, source locations, function names, or results.
6. **Respect tool and license constraints.** Do not bypass licensing, authentication, access controls, or platform protections. Do not request, expose, or reuse private keys, credentials, tokens, or license material. Commercial analysis tools must be lawfully licensed by the user.
7. **Minimize side effects.** Runtime analysis may launch processes, interact with a device, access files, or create captures. Explain meaningful side effects before taking consequential actions; prefer read-only/static workflows where practical.
8. **Keep the implementation original.** When asked to build a similar feature, derive requirements and observable behavior from evidence, then implement a clean, compatible version in the user's project. Do not copy proprietary source, assets, secrets, or unrelated application data.
9. **Validate the result.** Create tests for observed behavior and edge cases. Run the relevant tests or build commands when available. Distinguish tests actually run from tests merely recommended.
10. **Report limits honestly.** Provider availability, obfuscation, stripped symbols, missing source maps, incomplete captures, version differences, and runtime conditions can limit conclusions.

## Investigation workflow

### Phase A — Frame the question
- Restate the behavior the user wants to understand.
- Identify the authorized target and its version/platform.
- Define a concrete question and what evidence would answer it.
- List constraints and avoid collecting unrelated data.

### Phase B — Check readiness
- Discover REA's current tool catalog and session state.
- Check whether the needed operation and provider are available.
- If unavailable, explain the exact prerequisite and offer a supported alternative. Do not repeatedly call an unavailable tool.

### Phase C — Inspect
- Choose the least invasive suitable path: source/artifact inspection, metadata, static analysis, then runtime observation if necessary.
- Trace only relevant components and boundaries.
- Cross-check important conclusions with a second independent signal when practical.
- Preserve exact evidence references and note version/context.

### Phase D — Synthesize
Provide:
- **Question**
- **Findings** (confirmed / likely / unknown)
- **Evidence** (tool results and source locations)
- **Behavioral model** (short sequence or pseudocode based only on evidence)
- **Dependencies and constraints**
- **Implementation implications**
- **Remaining uncertainties**

### Phase E — Implement and verify (only if requested)
- Inspect the destination project's existing architecture before editing.
- Propose a small plan and keep changes scoped to the requested feature.
- Avoid overwriting unrelated work or changing public interfaces without need.
- Add focused tests based on observed behavior.
- Run the smallest meaningful test set, followed by broader checks if justified.
- Report changed files, commands actually executed, test outcomes, and remaining risks.

## Target-specific guidance

- **JavaScript/Electron:** trace entry points, imports, routes, preload/main/renderer boundaries, IPC channels, source maps, and native add-ons. Do not assume a renderer API is directly available in the main process.
- **Native binaries:** select an available provider (such as Hopper, Ghidra, or IDA) based on readiness and target format. Distinguish decompiler output from original source; pseudocode is an interpretation.
- **.NET:** use metadata, CIL, declared dependencies, and method references; state clearly when analysis is static only.
- **Android:** inspect the manifest, package metadata, resources, classes, and method references. Device/runtime actions require explicit scope and may affect a real device.
- **Websites and network captures:** use only authorized targets and supplied captures or permitted observations. Treat tokens, cookies, personal data, and private payloads as sensitive; do not repeat them in reports.
- **Firmware, packets, crashes, WASM, SQLite, and other formats:** first consult REA's capability catalog and the relevant format guide. Do not infer support from a file extension alone.

## Example user requests

- "Trace how this app implements search and show the evidence."
- "Explain the dependency chain for this Electron feature."
- "Inspect this binary and tell me which conclusions are confirmed versus speculative."
- "Based on the observed behavior, implement a compatible version in my project and add tests."

The skill guides the investigation; it does not replace REA's MCP server, required analysis providers, or lawful access to the target.
