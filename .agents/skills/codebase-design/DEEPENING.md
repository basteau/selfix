# Consolidating related behavior safely

Use the concepts in [codebase-design](SKILL.md). The goal is a simpler caller experience and better locality, not consolidation for its own sake.

## Classify the dependencies

- **In-process computation:** exercise real functions directly. Keep related behavior behind an existing interface where possible; no adapter is needed merely because several functions collaborate.
- **Local I/O or tools:** prefer temporary fixtures and the real dependency. In selfix, use actual files, Vue parsing, and Tailwind compilation when testing their behavior. A stand-in is appropriate only when it preserves the relevant semantics and real integration coverage remains.
- **Remote services you own:** if applicable, isolate transport from behavior and consider an injectable boundary. Do not introduce remote-service architecture into a local tool speculatively.
- **Third-party remote services:** control the external boundary when necessary; document what a mock cannot validate. Prefer a small parameter or existing interface over a generic abstraction.

## Plan the change

Identify the current callers, required behavior, failure modes, and tests. Explain what becomes simpler for callers and what complexity moves inside. If complexity merely changes files, the proposal needs a stronger justification.

Do not expose internal dependencies through a public interface solely for tests. Multiple genuine implementations can justify an abstraction, but count actual use cases rather than adapters created to justify a design.

## Preserve coverage

1. Name the behavioral guarantees existing tests protect.
2. Add or adapt coverage at the proposed boundary and observe meaningful results before removing old paths.
3. Migrate callers in reviewable steps, keeping checks green.
4. Delete an old test only when replacement coverage demonstrably protects its guarantee and the old test is now redundant or implementation-coupled.

A smaller test count is not the goal. Keep focused parser, compiler, and error-location regressions when a broader test does not preserve their precision. Run the affected tests and `pnpm check` after the refactor.
