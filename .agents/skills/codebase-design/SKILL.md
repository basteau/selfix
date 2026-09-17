---
name: codebase-design
description: "Design simpler interfaces and testable modules. Consult when deciding where behavior belongs, whether an abstraction pays off, or which boundary to test."
---

# Codebase Design

Prefer substantial behavior behind a small, understandable interface. Inspect relevant callers and tests before proposing changes. This is design reference, not authorization to start a refactor.

## Useful concepts

- A **module** can be a function, file, or package with callers and an implementation.
- Its **interface** includes what callers must know: inputs, outputs, errors, invariants, ordering, configuration, and important performance constraints, not just TypeScript signatures.
- A **deep module** hides useful complexity behind a small interface. Depth is not a line-count ratio; a large file is not automatically better.
- A **testing boundary** or **seam** is where behavior can be exercised or a dependency substituted without exposing unrelated internals.
- **Locality** means related changes, bugs, and knowledge concentrate in one place. **Leverage** means callers gain useful behavior without repeating its complexity.
- An **adapter** translates between an interface and a concrete dependency; it is a role, not a reason to introduce a class or framework.

Use these concepts when helpful, with ordinary language and existing project names. No prescribed glossary or domain-language document is required.

## Questions that earn a design change

1. What concrete maintenance or correctness problem does the current interface create?
2. Which facts must callers repeat or understand that could be hidden safely?
3. Would consolidation remove navigation and coordination costs, or merely create a larger unrelated module?
4. Can existing interfaces and plain functions solve it without new configuration, dependencies, or layers?
5. What behavior will tests observe, and will those tests survive an internal rewrite?

Apply the deletion test: if removing a wrapper also removes complexity, it may be unnecessary. If removing it makes several callers duplicate difficult logic, it may be earning its place. Verify this against real callers rather than naming conventions.

Keep naturally related behavior together; separate responsibilities that change for unrelated reasons. A long function or repeated conditional is evidence to inspect, not an automatic refactor order. Sometimes leaving the design alone is the best decision.

## Testability without speculative architecture

Prefer returning observable results and using real local dependencies. Introduce dependency injection where something actually varies or an important external boundary must be controlled. A production implementation plus a mock does not by itself justify a new port or service layer.

Internal testing boundaries can remain internal. Do not expand the consumer API merely because tests need access. Existing collector and compiler-facing functions can be valid test boundaries alongside the linter API and CLI.

For dependency-specific consolidation and coverage preservation, read [DEEPENING.md](DEEPENING.md). For consequential choices with genuinely different possible interfaces, read [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md). Neither exercise is mandatory for routine fixes.
