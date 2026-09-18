# 02: Extend discovery to factories, wrappers, and Nuxt UI metadata

Status: draft
Blocked by: 01-resolve-component-sources.md

## Goal

Explore and specify broader component discovery after the core source/prop metadata boundary exists: variant factories, imported prop types, broader package resolution, Nuxt UI effective variant metadata, and Vue wrapper forwarding. Extend useful, verified guidance without making unsupported claims about a component's effective public API.

This is retained draft work, not one approved implementation-sized task. Investigate representative source forms and split into independently verifiable slices before promotion if the breadth requires it.

## Acceptance criteria

- [ ] Inspect representative local Vue components, shared workspace packages, and the pinned Nuxt UI package plus prepared application artifacts. Record concrete source forms and gaps before selecting the supported subset or making compatibility claims.
- [ ] Extend the core's alias/tsconfig and explicit-barrel support where concrete fixtures require it; agree on broader package import/export, export-star, and imported-type resolution semantics, including conditions, generated files, cycles, ambiguity, missing sources, and freshness. Do not execute framework configuration to emulate its resolver or promise complete TypeScript/bundler resolution.
- [ ] Define import-aware extraction for supported `cva`/`tv` factories and their prop-type relationships, including relevant `VariantProps` forms. Prove which factory belongs to the component and which values the public prop accepts; do not borrow the first factory in a file or evaluate its body. Opaque, computed, spread, or extended definitions need explicit semantics.
- [ ] Keep factory metadata extraction distinct from collecting class arguments. Coordinate with the existing helper-discovery draft without expanding it to treat variant objects as ordinary class objects or duplicating its work.
- [ ] Specify Vue forwarding separately for class ownership and size/variant prop availability. Account for single-root fallthrough, `inheritAttrs: false`, declared/consumed props, `$attrs`, explicit forwarding, multiple roots, conditional targets, fixed inner props, and wrapper chains. Never recommend an inner prop that the wrapper does not expose.
- [ ] Agree whether and how proven wrapper forwarding changes policy/contract selection; do not silently alter the core ticket's local-name semantics. Ambiguous targets must not receive an arbitrary first target's contract or metadata.
- [ ] Reuse the automatic prepared Nuxt component mappings and explicit escape hatches established by ticket 01. Extend only evidenced resolution gaps needed for advanced metadata; do not defer basic auto-import/alias discovery back out of the core or duplicate it. Preserve its preparation, override, path-base, and failure semantics.
- [ ] For Nuxt UI size/variant guidance, distinguish package declarations/factories from generated application metadata and runtime customization. Verify values against the supported effective public API; do not label a package default list as the complete application-specific set. Omit or qualify incomplete metadata and never suggest modifying node_modules.
- [ ] Preserve application-generated CSS aliases, theme preparation/errors, existing U-component recognition, configured `ui` slot maps, classProps matching, original locations, prop/slot metadata, source-only API behavior, and independent findings. Per-slot contracts and whole-map expression evaluation remain outside scope unless separately approved.
- [ ] Extend the existing pinned Nuxt integration fixture for each supported Nuxt-specific behavior, including a customized application case that differs from package defaults when the selected feature claims to support that difference. Record unsupported forms explicitly.
- [ ] Agree on diagnostic provenance, failure behavior, performance bounds, cache invalidation, documentation, and test boundaries for each promoted slice. Keep existing violations when optional metadata is unavailable; preserve explicit failures for unsupported enforcement inputs and broken theme loading.
- [ ] Retain Vue's parser, Node built-ins where practical, the standalone runner/config, and Vue/Tailwind-only consumer peers. No application expression evaluation, automatic source edits, framework execution, or new publishable package.

## Verification

Before promotion, establish a small evidence-backed fixture matrix and implementation-sized slices. For each supported behavior, use real Vue parsing, compiler-backed public diagnostics, and temporary filesystem/API/CLI tests rather than mocks of internal discovery functions. Include positive cases and near-miss cases where suggestions or inherited contracts would be wrong, cyclic imports/wrappers, shadowed factories, non-forwarded props, local Nuxt overrides, and stale/missing artifacts.

Keep deterministic Nuxt-shaped regressions in the routine suite and use the existing pinned `pnpm smoke:nuxt` fixture to substantiate actual framework/package support. Run `pnpm check`, applicable integration checks, and `git diff --check`; record versions, outcomes, independent review, and remaining limits for each implemented slice. Do not claim parity with upstream from unit fixtures alone.

## Notes

- The user approved retaining this broader scope as a draft dependent on [core discovery](01-resolve-component-sources.md), with Nuxt UI support explicitly preserved and extended where needed. No separate spec was supplied and no implementation is authorized yet.
- The hard dependency is the core project-context/resolution/metadata contract. Other capabilities are not automatically a linear chain; reassess dependencies when splitting this draft. Missing public API, type-resolution, wrapper-policy, and Nuxt effective-metadata decisions block promotion to ready.
- Related existing drafts retain their identities: [static dynamic/namespace component recognition](../v1-readiness/13-recognize-static-component-expressions.md), [class helper identity](../v1-readiness/16-configure-and-resolve-class-helpers.md), and [representative adoption workflows](../v1-readiness/18-validate-representative-adoption-workflows.md). Coordinate or declare genuine dependencies after the supported subset is agreed; do not implement those tickets implicitly.
- Preserve completed [Nuxt theme integration](../core-hardening/09-load-application-nuxt-ui-theme.md) and [classProps support](../core-hardening/10-inspect-configured-class-props.md). Reuse `packages/selfix/scripts/smoke-nuxt.mjs`; keep direct framework dependencies confined to temporary integration consumers.
- Upstream reference is pinned at `bf89dcb7f66a306c7ac4943065298902afdbd969`: [variant extraction](https://github.com/shadcn-ui/lint/blob/bf89dcb7f66a306c7ac4943065298902afdbd969/packages/lint/src/project/variants.ts), [wrapper analysis](https://github.com/shadcn-ui/lint/blob/bf89dcb7f66a306c7ac4943065298902afdbd969/packages/lint/src/project/wrappers.ts), and [resolution](https://github.com/shadcn-ui/lint/blob/bf89dcb7f66a306c7ac4943065298902afdbd969/packages/lint/src/project/resolve.ts). React className forwarding is not Vue attribute fallthrough; use [Vue's documented semantics](https://vuejs.org/guide/components/attrs.html). Preserve attribution when adapting code.
- Agent evaluations, spelling corrections, approximate color matching, and arbitrary-value scale conversion are separate work. No commit, push, or external publication is authorized by ticket creation.

- Scope updated after user approval: common tsconfig/jsconfig aliases and verified prepared Nuxt component mappings now belong to ticket 01. This ticket remains draft for richer type/factory metadata, broader package resolution, and wrapper semantics; its dependency is unchanged.
