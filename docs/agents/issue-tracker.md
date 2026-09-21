# Issue tracker: GitHub

Issues and specs live in [basteau/selfix GitHub Issues](https://github.com/basteau/selfix/issues). Use the authenticated `gh` CLI; GitHub is the source of truth, not local ticket files.

## Operations

- Read: `gh issue view <number> --repo basteau/selfix --comments`; also fetch the body, labels, and state with `--json body,labels,state`.
- List: `gh issue list --repo basteau/selfix --state open --json number,title,body,labels`. Paginate or increase limits when surveying the backlog; include closed issues when checking prior work or duplicates.
- Create: `gh issue create --repo basteau/selfix --title "..." --body-file <file>`. Use a temporary Markdown file or heredoc for multiline bodies.
- Update: `gh issue edit <number> --repo basteau/selfix --body-file <file>`. Read the current body first and preserve existing decisions and evidence.
- Record progress: `gh issue comment <number> --repo basteau/selfix --body-file <file>`.
- Close: `gh issue close <number> --repo basteau/selfix --reason completed` only after completion conditions hold.

When a skill says to publish a spec or ticket, create a GitHub issue. When it says to fetch a ticket, read its issue body, comments, linked spec, and dependencies. Resolve bare issue numbers in this repository; ask when the repository or intended issue is ambiguous. GitHub shares issue and PR numbers: if the reference is a PR, read it with `gh pr view` and inspect `gh pr diff` as appropriate.

## Status and dependencies

Keep a `Status:` line in the body: `draft` (unapproved), `ready` (approved), `in-progress`, `blocked`, or `done`. Drafts remain open but are not eligible for implementation. Explain blockers in Notes. Only ready work whose prerequisites are done is eligible. Confirm ownership before resuming in-progress work.

Use issue URLs for specs, related work, and `Blocked by:` entries (`none` when absent). Create blockers first. Reject missing or circular dependencies. Add native GitHub dependencies where supported:

```sh
gh api repos/basteau/selfix/issues/<blocker-number> --jq .id
gh api --method POST repos/basteau/selfix/issues/<dependent-number>/dependencies/blocked_by -F issue_id=<blocker-database-id>
```

Keep the body links readable even with native dependencies. If that endpoint is unavailable, the body links are the fallback; read each blocker and confirm completion rather than assuming a closed issue was implemented.

Keep acceptance criteria, decisions, progress, verification commands/results, and review outcomes in the issue or its comments. Mark `done` and close only when acceptance criteria, review, and required checks pass; record remaining nonblocking limitations. A commit is required only when requested. Do not automatically close a parent spec, implement drafts, commit, or push merely because tickets were created.

## Historical tickets

The former `.agents/tickets/` tracker is retired. Transferred issues identify their original path and pinned source revision; completed context remains closed. Untransferred completed history remains available in the [pinned Git archive](https://github.com/basteau/selfix/tree/39a1e6beabeae6936b29c484c24d5c51b0d7038d/.agents/tickets), not as an active second tracker. Old approval and command records describe their original task and do not authorize new implementation or publication.

## Pull requests as a triage surface

**PRs as a request surface: no.**

No triage label vocabulary is configured because the triage skill is not installed.

Adapted from [Matt Pocock's setup skill](https://github.com/mattpocock/skills/tree/main/skills/engineering/setup-matt-pocock-skills).
