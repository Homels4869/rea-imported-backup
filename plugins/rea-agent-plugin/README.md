# REA Reverse Engineering Plugin

A packaged plugin for **Claude Code** and **Codex**, with **75 REA skills** and **11 specialist agent definitions**. It supports evidence-first reverse engineering and repository contributions.

## Included

- **75 skills:** 2 foundational skills plus 73 task-specific workflows for issue intake, architecture, static analysis, providers, execution boundaries, tests, performance, docs, packaging, and PR handoff.
- **11 specialist agents:** Claude Code subagents in `agents/` for coordination, triage, architecture, reverse engineering, provider work, implementation, testing, scope review, performance, docs, and independent review.
- **Portable skill layer:** Codex and Claude Code can use the skill catalog. The current Codex plugin manifest registers skills and MCP, not automatic subagent discovery from `agents/`. In Codex, treat agent files as role briefs unless the installed surface confirms actual subagent delegation.
- **REA MCP server:** `.mcp.json` launches the published `rea-agents@latest` package, not unpublished source changes in this fork.

Start with [SKILLS_CATALOG.md](./SKILLS_CATALOG.md), [AGENTS_AND_SUBAGENTS.md](./AGENTS_AND_SUBAGENTS.md), and [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md). Use [the task contract](./templates/agent-task.md) and [handoff template](./templates/agent-handoff.md) for contribution work.

## Authority and safety limits

The plugin does not grant GitHub credentials, filesystem access, branch-push rights, provider licenses, or merge authority. Agent operations depend on the connected client, environment, available tools, and user permissions. Current repository rules and contribution-scope boundaries remain authoritative.

Agents must preserve unrelated changes, avoid working directly on `main`, report checks honestly, leave human readiness declarations unchecked, and never attest to human review, approve their own changes, merge, change branch protection, or bypass required checks.

## Requirements

- Supported Node.js/npm runtime.
- Network access for the first `npx` package run.
- Software/data the user owns or is authorized to analyze.
- Optional analysis providers only for workflows that need them.

## Important files

- `plugin.json`: portable manifest.
- `.claude-plugin/plugin.json`: Claude Code manifest.
- `.codex-plugin/plugin.json`: Codex-compatible manifest.
- `.mcp.json`: REA MCP server registration.
- `skills/*/SKILL.md`: workflows.
- `agents/*.md`: Claude Code specialist definitions and reusable role briefs.
- `SKILLS_CATALOG.md`: skill inventory and routing index.
- `AGENTS_AND_SUBAGENTS.md`: subagent routing and client caveats.
- `scripts/validate-plugin.mjs`: structural/count/catalog validator.
- `TESTING.md`: static and real-client test procedures.

## Validate

Run from the repository root:

```bash
node plugins/rea-agent-plugin/scripts/validate-plugin.mjs
```

The GitHub workflow runs the same static validator. Static checks do not install Claude Code/Codex, launch a real provider, or prove end-to-end analysis.

## Use with Codex

Select `plugins/rea-agent-plugin` as the plugin root using the supported workflow for the installed Codex version. Enable **REA Reverse Engineering** and start a new session. Check actual subagent support instead of assuming the role files are auto-registered.

## Use with Claude Code

Add this directory as a local plugin marketplace/source using the installed version's supported workflow, install/enable `rea-reverse-engineering`, restart, and confirm skills, specialist subagents, and the `rea` MCP server are discoverable.

The main REA setup workflow is:

```bash
npx rea-agents@latest setup
```

Review configuration changes before approving them.

## Verify the connection

1. Run the static validator.
2. In Claude Code, delegate one read-only architecture/triage task and inspect the evidence returned by the actual subagent.
3. In Codex, confirm skill/MCP discovery and determine whether real subagent delegation is available.
4. Run a read-only analysis against software/data you own or are authorized to inspect.
5. In a REA checkout, verify the agent reads `AGENTS.md` and `CONTRIBUTING.md`, inspects Git state, adds focused tests when appropriate, and reports actual command results.
6. Record exact client versions, provider availability, unrun checks, and failures.

Analyze only authorized software. Runtime analysis may have side effects. External tools remain subject to their licenses. A disclaimer does not create permission or containment and does not override REA contribution-scope rules.
