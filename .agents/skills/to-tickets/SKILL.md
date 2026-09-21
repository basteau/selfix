---
name: to-tickets
description: "Split a spec, plan, or discussion into approved GitHub issues with explicit dependencies."
disable-model-invocation: true
---

# To Tickets

Create small, independently verifiable slices, not separate tickets for tests, implementation, and documentation of the same behavior. Read [issue tracker guidance](../../../docs/agents/issue-tracker.md) before writing.

## Process

1. Read the supplied spec or discussion and any existing tickets, including their notes. Inspect relevant code when needed. If requirements are not settled, retain them as draft work rather than presenting it as ready.
2. Propose a numbered breakdown. Each ticket should fit a fresh implementation session and deliver a complete observable result with its tests. For selfix, this may span collection, rule output, and CLI behavior; do not invent application layers the change does not need.
3. Show each title, delivered behavior, and blockers. Ask the user to approve the granularity and dependencies before publishing issues. Prefer genuine prerequisites over an arbitrary linear chain. A proposed prefactor must have a concrete justification and be independently verifiable.
4. Publish approved tickets as GitHub issues, with blockers first. Preserve existing issue identities and check for duplicates. Reject circular or missing dependencies.
5. Report issue URLs and which tickets are ready and unblocked. Do not implement them or close the parent spec.

Use issue URLs for blockers and the spec. If tickets are created directly from a discussion, include enough agreed context to stand alone and omit the spec field rather than creating a broken link. If the feature scope is ambiguous, ask.

## Ticket template

```markdown
# <Title>

Status: ready
Spec: <spec issue URL>
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

Replace `none` with blocker issue URLs when dependencies exist. Use `draft` instead of `ready` for unapproved scope or unresolved testing decisions. Follow the tracker guidance for native dependencies and state transitions.

For a genuinely wide mechanical refactor that cannot land in vertical slices, consider expand → migrate → contract, keeping checks green at each step. For this small workspace, first ask whether one bounded ticket would be simpler. Do not introduce compatibility layers merely to create more tickets.
