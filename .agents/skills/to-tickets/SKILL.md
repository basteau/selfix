---
name: to-tickets
description: "Split a spec, plan, or discussion into approved local tickets with explicit dependencies."
disable-model-invocation: true
---

# To Tickets

Create small, independently verifiable slices, not separate tickets for tests, implementation, and documentation of the same behavior. Read [issue tracker guidance](issue-tracker.md) before writing.

## Process

1. Read the supplied spec or discussion and any existing tickets, including their notes. Inspect relevant code when needed. If requirements are not settled, retain them as draft work rather than presenting it as ready.
2. Propose a numbered breakdown. Each ticket should fit a fresh implementation session and deliver a complete observable result with its tests. For selfix, this may span collection, rule output, and CLI behavior; do not invent application layers the change does not need.
3. Show each title, delivered behavior, and blockers. Ask the user to approve the granularity and dependencies before writing files. Prefer genuine prerequisites over an arbitrary linear chain. A proposed prefactor must have a concrete justification and be independently verifiable.
4. Publish the approved tickets to `.agents/tickets/<feature>/<NN>-<slug>.md`, numbered from `01` with blockers first. Preserve existing ticket identities; never overwrite or renumber completed work to make a new sequence prettier. Reject circular or missing dependencies.
5. Report paths and which tickets are ready and unblocked. Do not implement them, close the parent spec, or publish anything externally.

Use sibling filenames for blockers and relative links to the spec. If tickets are created directly from a discussion, include enough agreed context to stand alone and omit the spec field rather than creating a broken link. If the feature directory is ambiguous, ask.

## Ticket template

```markdown
# <NN>: <Title>

Status: ready
Spec: [Feature](spec.md)
Blocked by: none

## Goal

The observable behavior this ticket delivers and the boundaries of the change.

## Acceptance criteria

- [ ] A specific, verifiable outcome.

## Verification

The agreed testing approach; append commands and outcomes during implementation.

## Notes

Decisions, blockers, review findings, and completion evidence.
```

Replace `none` with filenames such as `01-parser-scope.md` when dependencies exist. Use `draft` instead of `ready` for unapproved scope or unresolved testing decisions. The remaining state transitions are defined in [issue tracker guidance](issue-tracker.md).

For a genuinely wide mechanical refactor that cannot land in vertical slices, consider expand → migrate → contract, keeping checks green at each step. For this small workspace, first ask whether one bounded ticket would be simpler. Do not introduce compatibility layers merely to create more tickets.
