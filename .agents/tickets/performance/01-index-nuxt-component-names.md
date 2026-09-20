# 01: Index prepared Nuxt component names once

Status: done
Blocked by: none

## Goal

Resolve supported prepared Nuxt component names through a lookup index constructed once per project snapshot, eliminating repeated full-map scans during lint and doctor. Preserve all existing component identity, ambiguity, precedence, metadata, and failure behavior.

The current global-component branch in `packages/selfix/src/project.ts` copies the generated map and normalizes every name on every resolution. Replace that repeated search with a small local map; do not broaden supported discovery or introduce a cache framework.

## Acceptance criteria

- [x] Construct the generated-name index once per project snapshot and use direct lookups for exact and existing kebab-case names in both lint and doctor resolution.
- [x] Preserve the current candidate-count semantics: ambiguous names remain unresolved even when competing entries point to the same source. An entry whose exact and normalized names coincide counts only once. Do not give exact matches new precedence over normalized collisions.
- [x] Preserve explicit component mapping precedence, imported-component resolution, supported default exports, unavailable definitions, and actionable errors for malformed or missing prepared artifacts and sources.
- [x] Preserve complete diagnostic content, severity, order, original SFC locations, prop/slot context, and doctor output. Definition discovery must not change recognition or enforcement.
- [x] Keep indexes isolated between project snapshots. Recreating a linter reflects changed generated metadata; existing snapshots retain their established behavior.
- [x] Add focused regressions covering exact names, kebab names, lowercase names, normalization collisions, unknown names, explicit overrides, lint findings, and doctor usages without class attributes. Reuse real parsers and temporary prepared metadata fixtures.
- [x] Record a reproducible before/after benchmark with complete output equivalence for repeated and distinct component usages. Measure lint and doctor separately; do not claim independent speedups from overlapping optimizations can be added together.
- [x] Keep the implementation local to existing project discovery using plain functions and a map. Add no dependency, public API, configuration, watcher, or persistent cache.

## Verification

Run focused project and CLI/doctor regressions, then `pnpm check` and `git diff --check`. Review precedence and collision handling explicitly before marking done. Record commands, outcomes, review findings, and remaining limitations here.

Reproduce the audit workload with 2,000 generated component declarations pointing to valid local Vue sources and 1,000 repeated recognized `<UiComponent250 class="p-4" />` usages. Construct a linter outside each measured lint interval, warm it, and report the median of at least five measurements. Compare complete diagnostics before/after, including definition paths. Add a workload using many distinct generated names and a doctor workload so local reuse from ticket 02 cannot hide name-index behavior. Keep fixture preparation outside measured intervals and report fixture sizes, versions, finding/usage counts, and timing ranges. Use behavioral regression tests, not wall-clock assertions or a permanent benchmark subsystem.

## Notes

- Created directly from the performance review discussion on 2026-09-20; no separate spec exists. The user approved this ticket as ready with no blockers. Numbering is suggested implementation order, not a dependency chain. Ticket creation does not authorize implementation, commits, or external publication.
- Audit evidence on macOS with Node 24.21.0: 2,000 generated names and 1,000 repeated violations took approximately 265.35 ms before and 3.38 ms with a temporary name-index prototype, median of five warmed lint runs. Full diagnostics and selected collision cases matched. These synthetic measurements are supporting evidence, not a required threshold or application-wide guarantee.
- Temporary audit reproducer: `/tmp/selfix-project-perf.mjs`. Temporary files may disappear; the workload description above is the durable reproduction basis. Prototype checks do not replace regression coverage and review of the final implementation.
- Reuse completed [core component discovery](../component-discovery/01-resolve-component-sources.md) and [doctor](../doctor/01-explain-component-protection.md). The broader discovery draft is not a prerequisite and must not be absorbed.
- Preserve the standalone runner, Vue/Tailwind-only consumer peers, immutable source snapshots, and explicit unsupported-input/loading failures. Do not evaluate application expressions or framework configuration.

- Implementation baseline: `bcd74c7fcb4178c32212b3e2a072552d2c3931d0`, branch `main`, clean tracked/untracked worktree. Owned scope: this ticket, `packages/selfix/src/project.ts`, and focused project regressions. Behavior-preserving optimization: characterize existing behavior before changing lookup; no artificial failing test or timing assertion.

## Completion evidence (2026-09-20)

- Implemented a snapshot-local exact/normalized name map in `project.ts`. Each declaration contributes each spelling once; subsequent candidates mark that key ambiguous. Explicit/imported resolution and source validation remain unchanged.
- Added three focused regressions covering exact, kebab, lowercase, same-source collisions, unknown/named exports, precedence, missing sources, complete snapshot stability, slot/prop diagnostic locations, and classless doctor usages.
- Characterization: `pnpm exec vitest run packages/selfix/test/project.test.ts` passed all 42 tests before implementation. The first test draft incorrectly expected a token column instead of the binding's existing column; corrected to column 11 before implementation. This is a behavior-preserving optimization, so no artificial red performance assertion was introduced.
- `pnpm typecheck` passed. `pnpm exec vitest run packages/selfix/test/project.test.ts packages/selfix/test/cli.test.ts` passed 85 tests after implementation.
- `pnpm check` passed outside the sandbox: 18 test files / 546 tests, typecheck, Oxlint, Oxfmt, playground typecheck/design lint/build, and strict documentation validation/build. The initial sandboxed run encountered subprocess restrictions; the authorized unrestricted rerun passed. Installed locked dependencies with `corepack pnpm install --frozen-lockfile`; used temporary Corepack shims at `/tmp/selfix-tools` on PATH.
- `git diff --check` passed. No pre-existing work, staged changes, or relevant untracked files.
- Independent Standards review: 0 findings. Independent Spec review: 0 findings; final benchmark/check evidence was pending at review and is recorded here. Review scope was the baseline SHA above plus all owned working-tree changes.
- Implementation committed as `a7c8370` (`refactor(project): index prepared Nuxt component names`) after the user requested commit and push. No unresolved implementation findings. Synthetic timings do not establish application-wide speedups or additive gains with other performance tickets.

### Benchmark

Linux x64, Node 24.21.0, pnpm 11.23.0, Vue 3.5.42, Tailwind 4.3.3. 2,000 prepared declarations reference one valid local Vue component with literal size/variant metadata. Each workload has 1,000 usages: repeated name 250 or distinct names 0–999. Lint uses `class="p-4"`; doctor uses classless tags. One warmup and seven measured calls per workload; fixture creation and linter construction excluded. Each run returns 1,000 findings/usages. Full outputs compare with `assert.deepEqual` after V8 serialization (preserving undefined properties), including paths, messages, ordering, locations, and doctor fields.

| Workload        | Before median (min–max), ms | After median (min–max), ms |
| --------------- | --------------------------- | -------------------------- |
| lint-repeated   | 299.41 (286.40–301.97)      | 4.87 (3.94–7.49)           |
| doctor-repeated | 294.22 (265.46–310.03)      | 2.58 (2.30–2.63)           |
| lint-distinct   | 271.19 (266.23–274.15)      | 3.70 (3.46–5.55)           |
| doctor-distinct | 270.92 (264.93–275.77)      | 2.07 (1.92–3.14)           |

Reproduction: save the script below as `/tmp/selfix-project-perf.mjs`. From a checkout of the baseline revision above, run `pnpm build` then `node /tmp/selfix-project-perf.mjs before`. From the implemented revision at the same repository path, run `pnpm build` then `node /tmp/selfix-project-perf.mjs after`. Keep the temporary output files between runs. During this run, baseline `project.ts` was compiled from `git show` with TypeScript into the ignored build directory, then the normal build restored the implementation; tracked source was never rolled back.

```js
import { mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { serialize, deserialize } from "node:v8"
import { performance } from "node:perf_hooks"
import { strict as assert } from "node:assert"
const repo = process.cwd()
const { createLinter } = await import(pathToFileURL(repo + "/packages/selfix/dist/index.js"))
const phase = process.argv[2]
const root = "/tmp/selfix-name-index-benchmark"
mkdirSync(root + "/.nuxt", { recursive: true })
writeFileSync(
  root + "/Button.vue",
  `<script setup lang="ts">defineProps<{size:'sm'|'lg';variant:'solid'|'outline'}>()</script>`,
)
writeFileSync(
  root + "/.nuxt/components.d.ts",
  Array.from(
    { length: 2000 },
    (_, i) => `export const UiComponent${i}: typeof import('../Button.vue')['default'];`,
  ).join("\n"),
)
const linter = await createLinter({
  css: '@import "tailwindcss";',
  config: { components: ["^UiComponent"], project: { root } },
})
const results = {}
for (const distinct of [false, true]) {
  for (const method of ["lint", "doctor"]) {
    const key = `${method}-${distinct ? "distinct" : "repeated"}`
    const source =
      "<template>\n" +
      Array.from(
        { length: 1000 },
        (_, i) => `<UiComponent${distinct ? i : 250}${method === "lint" ? ' class="p-4"' : ""} />`,
      ).join("\n") +
      "\n</template>"
    let output = linter[method](source, root + "/Page.vue")
    const times = []
    for (let i = 0; i < 7; i++) {
      const start = performance.now()
      output = linter[method](source, root + "/Page.vue")
      times.push(performance.now() - start)
    }
    if (phase === "before") writeFileSync(`/tmp/selfix-${key}.json`, serialize(output))
    else assert.deepEqual(output, deserialize(readFileSync(`/tmp/selfix-${key}.json`)))
    times.sort((a, b) => a - b)
    results[key] = {
      count: method === "lint" ? output.length : output.usages.length,
      median: times[3],
      min: times[0],
      max: times[6],
    }
  }
}
console.log(
  JSON.stringify(
    { phase, node: process.version, declarations: 2000, usages: 1000, samples: 7, results },
    null,
    2,
  ),
)
```
