# 05: Slim the configuration and rule references

Status: ready
Blocked by: 01-simplify-api-options.md, 02-unify-file-matching.md, 03-simplify-policy-precedence.md

## Goal

Make rules and configuration useful for choosing and adjusting enforcement without teaching implementation algorithms. Describe the settled product from 01–03 and delete low-value content.

## Acceptance criteria

- [ ] Lead each rule with purpose, one failing/passing example, and the common correction. Keep scope and consequential exceptions; remove repetitive caveats and obscure example inventories.
- [ ] Keep common config, recognition, contracts, overrides, classProps, and an accurate compact option reference. Explain actual final defaults, matching, and precedence once.
- [ ] Reduce discovery to its benefit, configurable options, and actionable failure guidance. Delete TypeScript path resolution, re-export traversal, and prop-extraction algorithms; keep lifecycle guidance only in the API.
- [ ] Keep one useful custom message and supported placeholders. Delete internal category-selection ordering from the main explanation without making false replacement/fallback promises.
- [ ] Preserve recognition versus discovery, deny precedence, independently enabled rules, exclusion scope, unsupported-input failures, and executable-config trust. Fix incoming links to removed sections.

## Verification

Compare each retained claim with the completed code tickets and current tests. Execute representative contracts and exceptions against real Vue/Tailwind. Validate all affected links, rendered references, and pnpm check; run git diff --check. Record content removed rather than merely moved.

## Notes

Own apps/docs/content/configuration.md and rules.md. Current configuration is approximately 1,940 words and includes six discovery subsections; source/test algorithms are not a user-learning requirement. This scope supersedes exhaustive prose requirements in completed documentation/02 while preserving its history and important public behavior. Each preceding code ticket must update behavior docs itself; this ticket owns subsequent editorial reduction, not deferred correctness.

Created from the product/docs clarity discussion. The user approved the eight-ticket breakdown and dependencies, with 01–03 retained as drafts pending interface decisions. No separate spec exists. Approval here is to create local tickets, not to implement, commit, push, release, or publish externally.

Keep one publishable package, two private apps, standalone selfix.config.ts, Vue/Tailwind-only consumer peers, and no evaluation of application expressions. Preserve deterministic actionable original-SFC diagnostics. Prefer plain functions and Node built-ins. Keep essential setup in README and detailed docs in apps/docs/content; no port/migration documents or nested AGENTS.md files. Preserve existing working-tree changes and completed ticket identities.
