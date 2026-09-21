# 03: Remove redundant filesystem traversal work

Status: done
Blocked by: none

## Goal

Avoid redundant filesystem operations during CLI file selection and project snapshot creation while preserving the exact selected files, captured sources, supported path behavior, failures, and deterministic output.

Both `packages/selfix/src/cli.ts` and `packages/selfix/src/project.ts` read directories with file-type information and then stat their children again. The project snapshot also revisits directories reached through overlapping aliases because it tracks captured source files but not visited directories. Reuse known entry information and remember visited snapshot directories within the existing walkers.

## Acceptance criteria

- [x] Reuse directory-entry type information for recursively enumerated children instead of restatting each child. Continue inspecting explicit input/mapping paths where that information is unavailable; preserve existing handling of their symlinks and special file types.
- [x] Traverse an already visited project directory at most once per snapshot, including overlapping aliases, without skipping required explicit files or statically imported sources outside the root. Preserve established path identity; do not introduce new realpath-based canonicalization semantics just to deduplicate directories.
- [x] Preserve file/directory/glob selection, overlapping input deduplication, config-relative exclusions, ignored directories, nested symlink behavior, extension/index probing, alias precedence, and deterministic final output.
- [x] Preserve eager source snapshot semantics and supplied-source precedence. Lint must not gain lazy filesystem reads or silently observe a different dependency revision because traversal was deferred.
- [x] Preserve actionable failures for missing/unreadable requested inputs, mapping targets, and captured sources. Required traversal/read failures must not become a clean result; do not promise atomic snapshots or add a general filesystem race-handling layer.
- [x] Add focused CLI and project regressions covering overlapping inputs and aliases, external imports, explicit paths, symlinks, exclusions, unavailable targets, and snapshot isolation. Verify findings and doctor output where file selection matters.
- [x] Demonstrate reduced redundant operations with a bounded before/after traversal probe and equivalent outputs. Record CLI and project-snapshot measurements separately so parsing/theme work is not mistaken for traversal cost.
- [x] Keep the two walkers simple and local. Add no shared filesystem service, concurrent worker system, broad exclusion change, new configuration, or runtime dependency.

## Completion evidence

- Both walkers reuse enumerated `Dirent` values; explicit paths still use stat. Snapshot directories are deduplicated by existing absolute lexical path, without realpath or lazy reads. No shared service or dependency added.
- Preservation tests passed before implementation (92 focused tests) and after (94, including added real permission failures). Initial test authoring incorrectly requested doctor JSON; corrected to its established text interface before baseline validation. This behavior-preserving refactor did not invent a red assertion about internals. Existing tests retain extension/index probing, alias precedence, ignored directories, config-relative exclusions, editor-source precedence, and missing mapping coverage.
- `pnpm typecheck`, `pnpm exec vitest run packages/selfix/test/{cli,project}.test.ts`, `pnpm check`, and `git diff --check` passed. Final suite: 562 tests in 18 files, plus repository lint/format/typechecks, playground and documentation checks/builds.
- Same-agent working-tree review against `0403c1b3084d1995f7193c9aa1d72d243d61605a`: Standards: zero findings; Spec: zero findings. Reviewed both walkers and all added tests, staged diff (empty), unstaged diff, and untracked list (empty). Independent subagent tooling was unavailable. Directory deduplication does not prevent explicit ignored/symlink files from being captured; all traversal/read errors still propagate; source reads remain eager. No atomic snapshot/race guarantee introduced.
- Linux, Node 24.21.0 audit: three warmup pairs, seven measured alternating-order pairs, fixtures created outside timings, no concurrent builds. Complete CLI JSON/stdout/stderr/status matched (exit 1, 2,000 findings). Project definitions matched and retained `size: external` after disk edits. CLI ran with `project:false`; snapshot was measured separately without a compiler/theme. Instrumentation ran only after timing.

| Probe    | Before median (range), ms | After median (range), ms | Separate operation counts, before → after                             |
| -------- | ------------------------- | ------------------------ | --------------------------------------------------------------------- |
| CLI      | 79.42 (74.49–80.57)       | 67.50 (64.61–72.75)      | async stat 2,003 → 3; readdir 1 → 1                                   |
| Snapshot | 29.41 (28.64–34.57)       | 23.72 (23.50–25.23)      | statSync 4,018 → 2,010; readdirSync 6 → 2; readFileSync 2,002 → 2,002 |

- Limits: synthetic measurements are not a universal speedup claim. Remaining import-probe stats are unchanged and out of scope. Permission tests skip Windows/root, where mode bits cannot establish this failure; they executed here as uid 1000. No platform matrix or Nuxt/package smoke rerun was needed for this local traversal refactor. Implementation committed as `367728e` (`refactor(traversal): reuse entry types and snapshot directories`) after the user subsequently requested commit and push. Completion evidence is recorded in a separate documentation commit.

### Reproducing the bounded audit

Build current code with `pnpm build`. Obtain baseline CLI/project sources with `git show 0403c1b3084d1995f7193c9aa1d72d243d61605a:packages/selfix/src/cli.ts > /tmp/selfix-cli-before.ts` (repeat for project). Transpile those two files next to the current compiled modules so their relative imports use the identical current dependencies (the CLI fixture disables project discovery):

```sh
node --input-type=module -e 'import ts from "typescript"; import fs from "node:fs"; for (const name of ["cli","project"]) fs.writeFileSync(`packages/selfix/dist/${name}-before.js`,ts.transpileModule(fs.readFileSync(`/tmp/selfix-${name}-before.ts`,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText)'
```

Save the following as `/tmp/selfix-traversal-probe.mjs`, run `node /tmp/selfix-traversal-probe.mjs` from the repository root, then remove the two temporary `dist/*-before.js` modules. This is a one-off audit, not a permanent benchmark or unit-test timing threshold.

```js
import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { syncBuiltinESMExports } from "node:module"
import assert from "node:assert/strict"
const base = process.cwd()
const load = (name) => import(pathToFileURL(path.join(base, "packages/selfix/dist", name + ".js")))
const cli = [(await load("cli-before")).run, (await load("cli")).run]
const project = [
  (await load("project-before")).createProject,
  (await load("project")).createProject,
]
const root = fs.mkdtempSync(path.join(base, ".selfix-audit-"))
try {
  fs.mkdirSync(path.join(root, "app/src"), { recursive: true })
  fs.mkdirSync(path.join(root, "shared"))
  fs.writeFileSync(path.join(root, "app/theme.css"), '@import "tailwindcss";')
  fs.writeFileSync(
    path.join(root, "app/selfix.config.ts"),
    'export default {css:"theme.css",project:false,components:["^Button$"]}',
  )
  const component = (size) =>
    `<script setup lang="ts">defineProps<{size:'${size}'}>()</script><template><button/></template>`
  fs.writeFileSync(path.join(root, "shared/Button.vue"), component("external"))
  for (let i = 0; i < 2000; i++)
    fs.writeFileSync(
      path.join(root, `app/src/F${i}.vue`),
      '<script setup>import Button from "../../shared/Button.vue"</script><template><Button class="p-4"/></template>',
    )
  const app = path.join(root, "app")
  const options = { root: app, aliases: { "@/*": "./*", "src/*": "./src/*", "again/*": "./src/*" } }
  const runCli = async (i) => {
    let stdout = "",
      stderr = ""
    const code = await cli[i](["src", "--format", "json"], app, {
      out: (s) => (stdout += s),
      err: (s) => (stderr += s),
    })
    return { code, stdout, stderr }
  }
  const runProject = (i) => project[i](options)
  const resolve = (snapshot) =>
    snapshot.resolve(
      "Button",
      { local: "Button", importSource: "../../shared/Button.vue", imported: "default" },
      "src/F0.vue",
    )
  assert.deepEqual(await runCli(0), await runCli(1))
  assert.equal((await runCli(1)).code, 1)
  const snapshots = project.map((_, i) => runProject(i))
  assert.deepEqual(resolve(snapshots[0]), resolve(snapshots[1]))
  assert.deepEqual(resolve(snapshots[0]).props, { size: ["external"] })
  fs.writeFileSync(path.join(root, "shared/Button.vue"), component("edited"))
  for (const snapshot of snapshots)
    assert.deepEqual(resolve(snapshot).props, { size: ["external"] })
  fs.writeFileSync(path.join(root, "shared/Button.vue"), component("external"))
  for (const [label, run] of [
    ["CLI", runCli],
    ["snapshot", runProject],
  ]) {
    for (let j = 0; j < 3; j++) for (const i of [0, 1]) await run(i)
    const times = [[], []]
    for (let j = 0; j < 7; j++)
      for (const i of j % 2 ? [1, 0] : [0, 1]) {
        const start = performance.now()
        await run(i)
        times[i].push(performance.now() - start)
      }
    console.log(
      label,
      times.map((values) => {
        values.sort((a, b) => a - b)
        return { median: values[3], range: [values[0], values[6]] }
      }),
    )
  }
  const counts = {}
  for (const [object, names] of [
    [fs, ["statSync", "readdirSync", "readFileSync"]],
    [fsp, ["stat", "readdir"]],
  ])
    for (const name of names) {
      const original = object[name]
      object[name] = function (...args) {
        counts[name] = (counts[name] ?? 0) + 1
        return original.apply(this, args)
      }
    }
  syncBuiltinESMExports()
  for (const [label, run] of [
    ["CLI", runCli],
    ["snapshot", runProject],
  ])
    for (const i of [0, 1]) {
      for (const key of Object.keys(counts)) delete counts[key]
      await run(i)
      console.log(label, i === 0 ? "before" : "after", { ...counts })
    }
  console.log(
    "Equivalent complete CLI output/status and captured definitions; snapshot isolation passed.",
  )
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
```

## Verification

Run focused CLI and project tests, then `pnpm check` and `git diff --check`. Review directory deduplication, explicit-versus-enumerated paths, symlink behavior, and propagation of filesystem failures. Record commands, outcomes, review findings, and limitations here.

Reproduce the CLI audit with 2,000 small Vue files, a valid Tailwind stylesheet/config, and `project: false` to isolate file selection from snapshot creation. Compare complete output and exit status using alternating before/after runs, warmups, and at least seven measured invocations; report medians and ranges. Add a separate project snapshot fixture with overlapping alias roots and an imported source outside the root, confirming the captured definitions and their immutability after disk edits. Measure operation counts outside timing runs where instrumentation could affect results. Keep fixture creation outside measured intervals, run without unrelated builds, and avoid wall-clock unit-test thresholds or a permanent benchmark layer.

## Notes

- Implementation baseline: `0403c1b3084d1995f7193c9aa1d72d243d61605a` on `main`, clean index/tracked/untracked worktree. Own the two local walkers, focused CLI/project tests, traversal audit evidence, and this ticket. User requested next ready ticket implementation; no commit requested.

- Created directly from the performance discussion on 2026-09-20; no separate spec exists. The user approved ready status with no blockers. This is one bounded traversal cleanup across the existing CLI and snapshot walkers, not a prerequisite refactor for other tickets.
- Audit evidence on macOS with Node 24.21.0: an in-process CLI over 2,000 files with discovery disabled took approximately 112.96 ms before and 100.51 ms using existing directory-entry information. Seven measured alternating runs after warmup; ranges were approximately 108.57–119.38 ms and 95.68–101.57 ms. Output matched for that fixture. This is synthetic evidence, not an expected universal 11% improvement.
- Directory deduplication was identified by inspection; its additional benefit has not been established on a representative large project. Measure it during implementation instead of attributing the CLI prototype's gain to both changes.
- Temporary audit reproducer: `/tmp/selfix-walk-ab.mjs`. Preserve a reproducible fixture description and commands here when recording completion; do not depend on temporary files surviving.
- Existing [core discovery](../component-discovery/01-resolve-component-sources.md) establishes external-import capture, explicit mappings, and immutable snapshots. Do not replace eager discovery with lazy disk access or narrow source capture to only lint-selected files.
- Ticket creation does not authorize implementation, commits, or external publication.
