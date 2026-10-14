# REA Agents and Subagents

The plugin includes **11 specialist role definitions** under `agents/*.md`: coordinator, issue triager, architecture auditor, reverse-engineering analyst, provider specialist, implementation engineer, test engineer, security/scope reviewer, performance auditor, documentation maintainer, and independent reviewer.

## Client compatibility

Claude Code plugin installs can discover `agents/*.md` as specialist subagents. The Codex plugin manifest registers skills and MCP configuration; it does not declare this directory as an automatically registered Codex subagent facility. In Codex, these files are reusable role briefs. Spawn actual separate agents only when the installed Codex surface exposes that capability and its output confirms delegation; otherwise perform sequential specialist passes and label them honestly.

## Recommended routing

1. Coordinator reads `AGENTS.md` and `CONTRIBUTING.md`, frames the task and criteria.
2. Read-only specialists investigate architecture, evidence, provider, performance, or scope in parallel when truly supported.
3. One implementation owner edits files to avoid conflicts.
4. Test engineer maps acceptance criteria to tests and reviews lifecycle/error cases.
5. Independent reviewer reports findings without editing.
6. Coordinator integrates evidence and prepares the handoff.

## Parallel-work rules

- Delegate independent questions with separate deliverables.
- Do not allow parallel edits to the same file or branch.
- Do not send secrets, private binaries, credentials, or unnecessary target data to a subagent.
- A role file does not add credentials, permissions, filesystem access, external-tool licenses, or merge authority.
- Repository `AGENTS.md`, `CONTRIBUTING.md`, and maintainer decisions override these role prompts.
- Scope-sensitive work must pass REA's contribution-scope gate; a disclaimer or successful CI is not scope approval.
