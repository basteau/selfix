---
name: to-spec
description: "Turn an established discussion into a local Markdown specification."
disable-model-invocation: true
---

# To Spec

Synthesize what is already known; do not start a new interview. Read [issue tracker guidance](../to-tickets/issue-tracker.md) before writing.

1. Read the discussion, relevant code and tests, and any existing spec. Preserve the user's decisions and selfix's constraints. If material choices remain unresolved, record them as open questions rather than inventing answers.
2. Identify the observable behaviors and existing testing boundaries that can verify them. Reuse an approved testing approach. If none was agreed, propose it and ask for confirmation before marking the spec ready. Consult [codebase-design](../codebase-design/SKILL.md) only if the interface itself needs design work.
3. Choose a descriptive feature slug and write `.agents/tickets/<feature>/spec.md`. Create directories as needed. Read an existing file before updating it; preserve useful decisions and notes. If the feature or destination is ambiguous, ask rather than overwrite an unrelated plan.
4. Report the file path and any unresolved decisions. `Status: ready` means the scope and testing approach are approved; otherwise use `draft`. Creating a spec does not authorize implementation or mark any ticket done.

Use this proportional template. Include user stories only when they add information; a regression fix usually needs concrete examples and acceptance criteria instead.

```markdown
# <Feature>

Status: draft

## Problem

Who is affected, the current behavior, and why it matters.

## Desired behavior

What changes for the caller or user. Include representative inputs and outcomes.

## Scope and non-goals

What is included and explicitly excluded.

## Decisions

Agreed behavior, constraints, compatibility choices, and important trade-offs.

## Acceptance criteria

- [ ] An independently verifiable outcome.

## Testing approach

The agreed testing boundaries, regressions, and relevant existing tests.

## Open questions

Unresolved decisions, or "None".
```

Paths may be included as current navigation hints, not as a prescribed implementation. Prefer behavioral requirements over speculative code. Keep decisions with the spec; do not create a glossary, ADR hierarchy, or public issue.
