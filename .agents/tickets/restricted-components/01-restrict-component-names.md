# 01: Add no-restricted-components with replacement guidance

Status: ready
Blocked by: none

## Goal

Let projects prohibit particular Vue component names and recommend alternatives. For example, using CustomButton should report that UButton is preferred, even when CustomButton has no class attribute. Add a separate no-restricted-components rule rather than extending the styling responsibilities of no-restyle.

Deliver configuration, original-SFC diagnostics, CLI behavior, regression tests, and documentation together.

## Acceptance criteria

- [ ] Support this configuration through selfix.config.ts and the programmatic linter:

  ```ts
  rules: {
    "no-restricted-components": ["error", {
      components: [
        {
          name: "CustomButton",
          replacement: "UButton",
          message: "Use our standard button for consistent behavior.",
        },
      ],
    }],
  }
  ```

- [ ] Require a nonempty exact component name per restriction. Make replacement and message optional nonempty strings; reject malformed entries and unknown options. Keep these options distinct from class/category allow/deny policies. An empty or omitted restriction list bans nothing.
- [ ] Match direct component usages by local imported or global/auto-imported name, including Vue-compatible PascalCase and kebab-case spellings. Preserve Vue identity semantics for acronyms and exclude native elements, type-only imports, and literal v-pre content. Do not use case-insensitive matching that invents identities.
- [ ] Report usages without class attributes, independently of ui, components, componentImports, ignoreImports, no-restyle, and optional definition discovery. Styling-recognition settings do not exempt restricted components.
- [ ] Emit a deterministic finding at each restricted opening tag in the original SFC. Include the rule and component metadata, the optional replacement recommendation, and any configured message. For the example, guidance reads: `<CustomButton> is restricted. Use <UButton> instead. Use our standard button for consistent behavior.` Preserve existing note behavior and independent styling findings.
- [ ] Support off/warn/error and existing per-file overrides. Severity-only overrides preserve restrictions; a supplied components list replaces the inherited list, including clearing it with an empty list. With no configured restrictions, existing projects receive no new restriction findings.
- [ ] With the rule enabled and a nonempty effective restriction list, report unsupported dynamic/namespace component usages as explicit coverage diagnostics at original locations rather than silently treating them as compliant. Reuse collected unsupported-usage information; do not implement expression evaluation or new dynamic/namespace resolution. Document coverage-diagnostic severity and CLI behavior and test them consistently with existing unsupported-analysis conventions.
- [ ] Text and JSON CLI output expose the findings through existing reporting, exit-status, and warning-limit behavior. No source rewriting or automatic import/prop/event/slot migration is performed.
- [ ] Document the rule, configuration, overrides, name-matching limits, and replacement guidance in apps/docs/content/. Update existing rule-count/default-policy descriptions as needed and keep root README information concise.

## Verification

Add focused Vitest regressions at the public linter and CLI boundaries, plus collector/configuration tests where required. Cover classless usages, permitted components, imported and unimported name variants, acronym identity, native/v-pre/type-only exclusions, optional guidance, invalid configuration, severity and override behavior, original offsets/lines/columns, independent styling findings, and explicit unsupported-component coverage. Include a renamed-import case documenting that a name restriction does not track the original exported identity.

Run `pnpm check` before reporting implementation complete. Record outcomes and review findings here during implementation.

## Notes

- Created directly from the component-restriction discussion; no separate spec exists. The user approved this ticket's granularity, scope, and lack of prerequisites, and approved retaining ticket 02 as a dependent draft. Creating these tickets does not authorize implementation or external publication.
- Reuse the existing ComponentUsage collection in packages/selfix/src/vue.ts, which already records classless usages, import sources, unsupported forms, and source offsets. Integrate with existing config validation and linter reporting; no new parser, runtime dependency, adapter, or application layer is needed.
- Matching a local name is intentionally distinct from restricting an imported export. Importing CustomButton under a different local name is outside this ticket's identity guarantee; ticket 02 retains stronger matching for later design.
- Existing [dynamic/namespace recognition work](../v1-readiness/13-recognize-static-component-expressions.md) remains separate and is not a prerequisite. This ticket exposes incomplete coverage without implementing that draft.
- Follow AGENTS.md: standalone runner and native TypeScript config loading, Vue/Tailwind-only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and visible failures for unsupported analysis or theme loading.
