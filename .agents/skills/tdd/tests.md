# Tests that survive refactoring

Test behavior at an appropriate interface. A good regression gives a concrete input and an independently known result; the implementation can change without rewriting the assertion.

```ts
// Good: a user-visible diagnostic from a real SFC and theme.
const linter = await createLinter({
  css: '@import "tailwindcss";',
  config: { components: ["^Button$"] },
})
const diagnostics = linter.lint('<template><Button class="p-4" /></template>', "Example.vue")
expect(diagnostics).toEqual([
  expect.objectContaining({
    rule: "no-restyle",
    component: "Button",
    className: "p-4",
  }),
])
```

When the regression concerns source locations, assert exact locations as well. When it concerns unknown syntax, verify the uncertainty diagnostic rather than merely asserting that collection did not throw. Use positive cases to establish what remains allowed.

Avoid tests that:

- Verify calls between private collaborators instead of returned behavior.
- Recalculate the expected result using the production algorithm.
- Pass because they only assert an empty or truthy value unrelated to the requirement.
- Lock down incidental formatting or internal object structure.
- Use broad snapshots when a few precise assertions explain the contract better.

One test should explain one coherent behavior; several related assertions are fine. Parameterized tests are useful for meaningful input variants. Prefer focused regressions over large fixture matrices without a clear purpose.

Existing module-level tests remain useful when they reach a real parser or compiler boundary. During refactoring, remove a test only after replacement coverage demonstrably preserves its guarantee.
