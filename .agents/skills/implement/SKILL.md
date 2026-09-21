---
name: implement
description: "Implement an approved GitHub issue or bounded spec, with tests, review, and completion evidence."
disable-model-invocation: true
---

# Implement

Read [issue tracker guidance](../../../docs/agents/issue-tracker.md). Load referenced skills by reading their linked files if a native skill tool is unavailable.

1. Read the selected ticket, its linked spec if any, dependencies, and notes. If the user supplied a spec directly, agree on a bounded slice before starting. Ask which ticket when ambiguous; do not automatically consume an entire backlog. Start only eligible work. Resume `in-progress` work only after reading its progress and confirming it is not owned by another active session; resolve blockers explicitly before resuming a blocked ticket.
2. Record `HEAD`, branch, and initial tracked/untracked worktree changes. Preserve unrelated work; ask before editing overlapping pre-existing changes. Note the baseline and owned scope in the ticket when one exists. Mark the ticket `in-progress` before implementation.
3. Load [tdd](../tdd/SKILL.md). Use the approved testing boundaries, small red/green steps, focused tests, and regular typechecking. Ask before materially changing scope or test strategy. Documentation-only work uses relevant validation rather than artificial red tests.
4. Run `pnpm check`. Load [code-review](../code-review/SKILL.md), supplying the starting revision, baseline worktree state, owned files/hunks, and ticket/spec URL. Review the actual current changes, including staged, unstaged, and relevant untracked content, even if nothing has been committed.
5. Address blocking review findings within scope. Rerun affected tests and `pnpm check` after changes, and re-review changed areas. If a finding requires a new design decision, stop and ask rather than expanding the task silently.
6. Update acceptance criteria, verification commands/results, review outcomes, and remaining nonblocking limitations. If unable to finish, record the reason and appropriate state; a failed check is not a completed ticket. Do not close the parent spec automatically.
7. Commit only when the user requested it or granted explicit standing permission. Review the final diff and the entire staged diff, including anything staged before the task. Stage only owned changes; if unrelated changes are already staged, stop and clarify how to isolate the commit without disturbing the user's index. Follow the project's Conventional Commit and Lore trailer conventions. Never push without a separate explicit request.
8. Mark the ticket `done` and close its GitHub issue only when its completion conditions hold, including a successful commit if one was requested. Record the commit hash or failure in the ticket; do not claim completion after a failed commit.

Report what changed, checks run, relevant findings, ticket state, and commit hash if a commit was requested. Be explicit about checks not run or unavailable review tooling; do not claim independent review when performed by the same agent.
