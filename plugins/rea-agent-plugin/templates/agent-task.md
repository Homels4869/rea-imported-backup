# REA agent task contract

Copy this template into a task, issue, or prompt for Claude Code/Codex.

## Problem
What is wrong or missing? Include observed behavior, not only a proposed solution.

## Expected outcome
What should a user be able to observe when the task is complete?

## Scope
- Repository and branch:
- Relevant files/modules:
- In scope:
- Explicitly out of scope:

## Evidence
- Reproduction or source locations:
- Logs/artifacts (redacted):
- What is confirmed:
- What remains a hypothesis or unknown:

## Constraints
- Compatibility requirements:
- Permissions/authorization:
- Side effects to avoid:
- Performance/resource constraints:
- Public APIs or formats that must remain compatible:

## Acceptance criteria
- [ ] Observable behavior:
- [ ] Regression tests:
- [ ] Documentation:
- [ ] Required checks:
- [ ] Provider/platform coverage:

## Agent instructions
- Read the repository's `AGENTS.md` and `CONTRIBUTING.md` first.
- Inspect git status and preserve unrelated work.
- Propose a small plan before broad changes.
- Use a focused branch; do not commit directly to `main`.
- Run relevant checks and report exact commands and results.
- Label checks PASS, FAIL, NOT RUN, BLOCKED, or SOURCE REVIEW ONLY.
- Do not claim a test, push, PR, or deployment succeeded without evidence.
- Do not mark a PR ready, attest to human review, merge, or bypass required checks.
- Ask before consequential actions when authorization, target, or side effects are unclear.

## Required handoff
State the behavior changed, files touched, tests run and results, gaps, risks, branch/commit/PR status, and human decisions needed.
