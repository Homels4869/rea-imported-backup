# REA plugin validation and integration testing

## Static validation

Run from the repository root:

```bash
node plugins/rea-agent-plugin/scripts/validate-plugin.mjs
```

The validator checks JSON manifests and version parity, MCP configuration, existence/metadata for each skill, minimum skill count, catalog-link consistency, specialist-agent frontmatter/count, and required docs. It checks structure; it does not prove every workflow works in a real client.

## Real-client checklist

Test with current supported versions of Claude Code and Codex; record versions/output and do not mark a check passed without running it.

- [ ] Install/load the plugin for that client version.
- [ ] Confirm all 75 skills can be discovered/browsed.
- [ ] In Claude Code, confirm specialist definitions appear and a real subagent returns a read-only evidence-based report.
- [ ] In Codex, confirm skills/MCP discovery and determine whether this surface provides actual subagent delegation; role files alone are not proof.
- [ ] Confirm the `rea` MCP server starts and exposes tools.
- [ ] Run read-only analysis on authorized software/data.
- [ ] In a REA checkout, ask the agent to read `AGENTS.md`/`CONTRIBUTING.md`, inspect Git state, and propose a small test-backed task.
- [ ] Verify unrelated work is preserved, tests are added when appropriate, and commands/results are represented accurately.
- [ ] Verify agents do not mark PRs ready, attest to human review, merge, or bypass checks.
- [ ] Record failure details, provider prerequisites, and unsupported components.

## What static checks do not prove

Passing validation does not install clients, launch the published `rea-agents` package, confirm MCP discovery, start external providers, verify real-provider output, or prove GitHub write permission. Those require the real client, local environment, provider installation, and explicit permissions.
