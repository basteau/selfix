# Domain docs

This repository uses a single context despite its small pnpm workspace.

Before exploring, read root `CONTEXT.md` and relevant decisions in `docs/adr/`, when present. If either is missing, proceed silently: do not request or scaffold domain documents just to fill the layout. Create them lazily when domain terms or decisions actually need recording.

Use vocabulary defined in `CONTEXT.md` when naming concepts in issues, tests, and proposals. Reconsider invented synonyms; note genuine glossary gaps when relevant.

Flag proposals that conflict with an existing ADR explicitly rather than silently overriding it. Explain why the decision may need reopening.

Agent configuration lives in `docs/agents/`; domain decisions live in `docs/adr/`. User-facing guides and references remain in `apps/docs/content/`. `AGENTS.md` remains the only contributor/agent guide.

Adapted from [Matt Pocock's setup skill](https://github.com/mattpocock/skills/tree/main/skills/engineering/setup-matt-pocock-skills).
