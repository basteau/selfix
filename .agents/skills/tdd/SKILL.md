---
name: tdd
description: "Develop features or fixes test-first, one observable behavior at a time. Use for red-green-refactor work and focused regression tests."
---

# Test-Driven Development

Read the relevant request or ticket and nearby tests. Consult [tests.md](tests.md) and [mocking.md](mocking.md) before writing tests.

## Agree on the behavior and testing boundary

Identify the input, expected observable result, and interface that reaches the behavior. Reuse testing decisions already approved in the spec or ticket. If there is no agreed approach, propose one briefly and confirm it; ask again only when the boundary or scope materially changes.

Prefer existing boundaries: the linter API for diagnostics, the collector/compiler-facing functions for focused parser or theme regressions, and the CLI for config, filesystem, and exit behavior. An interface need not be an exported package API to be a useful existing test boundary. Avoid exposing internals solely to test them. Consult [codebase-design](../codebase-design/SKILL.md) if the interface itself needs design.

## Loop

1. **Red:** write one regression or behavior test with an independent expected result. Run it and verify that it fails for the intended reason, not a broken import or fixture. For bugs, reproduce the reported failure rather than a nearby symptom.
2. **Green:** implement only enough to satisfy that behavior. Run the focused test again. If it fails unexpectedly, investigate rather than weakening the expectation.
3. **Refactor when justified:** with tests green, make a small behavior-preserving simplification and rerun them. Defer broad design changes to review and explicit scope agreement.
4. Repeat for the next behavior. Run typechecking during development and finish with the repository's required checks, including `pnpm check`.

Use focused Vitest runs for feedback. Inspect current package scripts rather than assuming commands; tests exercising compiled output need an up-to-date build. Use real Vue parsing and Tailwind compilation for their behavior instead of mocking them into agreement. Never evaluate application expressions to make a test or implementation work.

## Avoid

- Writing every test first, then every implementation: each cycle should teach you about the next.
- Expectations computed with the same algorithm as the implementation.
- Assertions about private helper calls or module layout when the behavior is observable directly.
- Deleting difficult tests or adding interfaces just to make tests easier to write.

Record the red/green commands and outcomes when working from a ticket. For documentation-only changes or behavior-preserving refactors, explain which existing checks verify the work instead of inventing a meaningless failing test. TDD alone does not authorize a commit or push.
