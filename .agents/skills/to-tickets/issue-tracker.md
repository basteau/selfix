# Issue tracker: local Markdown

- Specs: `.agents/tickets/<feature>/spec.md`.
- Tickets: `.agents/tickets/<feature>/<NN>-<slug>.md`, numbered from `01`, one per file.
- Create directories on demand. This folder is gitignored, not shared or backed up by Git. Never force-add files or publish them externally without permission.
- Fetch a ticket by reading the supplied path, its spec if linked, dependencies, and notes. If only a number is supplied and it is ambiguous, ask for the feature or path.
- Use a `Status:` line: `draft` (unapproved), `ready` (approved), `in-progress`, `blocked`, or `done`. Explain blockers in `## Notes`.
- `Blocked by:` lists sibling ticket filenames or `none`. A ticket is eligible when it is `ready` and all dependencies are `done`. Detect missing or circular dependencies rather than guessing.
- Keep decisions in the spec, or in the ticket if no spec exists. Keep progress, review findings, and verification commands with outcomes in the ticket. Preserve existing notes when updating files.
- Mark a ticket `done` only when acceptance criteria are met, review is complete, and required checks pass. Record unresolved nonblocking findings explicitly. Completion does not require a commit unless the user requested one.
- When instructed to publish a spec or ticket, write these local files, not a GitHub issue. No tracker CLI, triage labels, glossary, or additional setup is needed.
