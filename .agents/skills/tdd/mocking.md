# Mocking boundaries

Prefer real collaborators when they are local, deterministic, and inexpensive. In selfix, that normally means real Vue parsing, Tailwind compilation, and isolated temporary filesystem fixtures.

Mock or control an external boundary only when needed, for example network access, time, randomness, or a process failure that is otherwise hard to reproduce. Explain what the substitute does not validate.

Do not mock internal modules merely to assert their call order or make a test pass. In particular, a mocked compiler response does not prove that Tailwind accepts a utility or loads a theme correctly.

Keep test fixtures isolated and clean them up after tests. Avoid relying on the developer's global configuration, installed packages outside the fixture, working directory, or network state.

If dependency injection is justified, prefer a small existing function parameter over a new service layer. A production implementation plus a mock does not automatically justify an abstraction: compare its cost with using the real dependency or an ordinary fixture first.
