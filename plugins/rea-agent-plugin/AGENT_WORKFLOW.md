# Agent participation workflow

This plugin contains **75 skills** and **11 specialist role definitions**. Use [SKILLS_CATALOG.md](./SKILLS_CATALOG.md) to select the right workflows and [AGENTS_AND_SUBAGENTS.md](./AGENTS_AND_SUBAGENTS.md) for host-specific delegation limits.

## Recommended loop

1. **Orient:** read the checkout's `AGENTS.md`, `CONTRIBUTING.md`, architecture docs, relevant issue/PR template, and Git status.
2. **Route:** use `agent-orchestration` for complex tasks; load only one or two domain skills first.
3. **Frame:** state problem, observable outcome, scope, constraints, evidence, and acceptance criteria.
4. **Investigate:** reproduce when possible and trace the owning boundary and consumers.
5. **Plan:** identify a small change and any maintainer approval/human decision required.
6. **Implement:** assign one owner to edits; preserve unrelated work and add regression tests.
7. **Verify:** run narrow checks first, broaden when warranted, and record exact commands/results.
8. **Review:** ask an independent reviewer for evidence-based findings without editing.
9. **Handoff:** report files, evidence, checks, failures, limits, and remaining decisions.
10. **Prepare review:** when authorized and supported, create/update a draft PR; leave human readiness declarations unchecked.

## Client capabilities

Claude Code plugin installs can discover `agents/*.md` as subagents. In Codex, use the skill catalog and role briefs; actual separate-agent execution depends on the installed surface and its tools. Without a real delegation tool, run sequential specialist passes and label them as such.

## Human ownership

The human owner must review the final diff, understand the change, verify claims, complete readiness declarations, and decide when to request maintainer review. Agents must not attest to human review, mark their work ready, merge, change branch protections, or bypass required checks.

## Failure handling

Report failed commands with observed exit results and sanitized output. Do not retry destructive operations blindly. Use `NOT RUN`, `BLOCKED`, or `SOURCE REVIEW ONLY` where appropriate; source inspection is not runtime verification.
