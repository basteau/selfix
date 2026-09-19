// Artifact-install testing approach inspired by shadcn-ui/lint (MIT).
// https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/scripts/smoke-install.mjs
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"

assert.ok(
  process.argv.length === 3 || process.argv.length === 5,
  "Usage: pnpm smoke:package /absolute/path/selfix.tgz [vue-version tailwind-version]",
)
const archive = realpathSync(process.argv[2])
const require = createRequire(import.meta.url)
const versions =
  process.argv.length === 5
    ? { vue: process.argv[3], tailwindcss: process.argv[4] }
    : Object.fromEntries(
        ["vue", "tailwindcss"].map((name) => [name, require(`${name}/package.json`).version]),
      )
// Canonicalize parent aliases (for example macOS /var → /private/var) while
// retaining the later check against an actual linked package.
const consumer = realpathSync(mkdtempSync(path.join(tmpdir(), "selfix-smoke-")))
// Do not inherit loaders or global module lookup paths from the development environment.
const env = { ...process.env }
delete env.NODE_PATH
delete env.NODE_OPTIONS

function run(command, args, expected = 0) {
  console.log(`> ${command} ${args.join(" ")}`)
  const result = spawnSync(command, args, {
    cwd: consumer,
    env,
    encoding: "utf8",
    timeout: 120_000,
  })
  assert.ifError(result.error)
  assert.equal(
    result.status,
    expected,
    `${command} failed (expected exit ${expected}):\n${result.stdout}\n${result.stderr}`,
  )
  return result.stdout
}

try {
  console.log(`Consumer: ${consumer}; Node ${process.version}; peers ${JSON.stringify(versions)}`)
  writeFileSync(
    path.join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module", dependencies: versions }),
  )
  // Network access is intentional. Install only the tarball and the two consumer peers.
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", archive])
  const installed = path.join(consumer, "node_modules/selfix")
  assert.equal(realpathSync(installed), installed, "selfix must be installed, not workspace-linked")
  const pkg = JSON.parse(readFileSync(path.join(installed, "package.json"), "utf8"))
  assert.deepEqual(Object.keys(pkg.peerDependencies).sort(), ["tailwindcss", "vue"])
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), [])
  for (const file of [pkg.bin.selfix, pkg.exports["."].import, pkg.exports["."].types]) {
    assert.ok(readFileSync(path.join(installed, file)).length, `Missing compiled artifact: ${file}`)
  }
  for (const file of ["README.md", "LICENSE"]) {
    assert.equal(
      readFileSync(path.join(installed, file), "utf8"),
      readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8"),
      `Packed ${file} must match root documentation`,
    )
  }
  writeFileSync(path.join(consumer, "theme.css"), '@import "tailwindcss";')
  writeFileSync(
    path.join(consumer, "selfix.config.ts"),
    'import { defineConfig, type Config } from "selfix";\n' +
      'const css: string = "theme.css";\n' +
      'export default defineConfig({ css, note: "packed-config-loaded" } satisfies Config);\n',
  )
  writeFileSync(
    path.join(consumer, "Page.vue"),
    '<template>\n  <div class="p-[13px]" />\n</template>\n',
  )
  const cli = path.join(consumer, "node_modules/.bin/selfix")
  const diagnostics = JSON.parse(run(cli, ["Page.vue", "--format", "json"], 1))
  assert.equal(diagnostics.length, 1)
  const { message, ...diagnostic } = diagnostics[0]
  assert.deepEqual(diagnostic, {
    file: path.join(consumer, "Page.vue"),
    rule: "no-arbitrary-values",
    severity: "error",
    line: 2,
    column: 8, // The original class attribute begins here.
    offset: 18,
    component: "div",
    className: "p-[13px]",
  })
  assert.ok(message.endsWith("packed-config-loaded"), "Native TypeScript config must be loaded")
  writeFileSync(path.join(consumer, "Page.vue"), '<template><div class="p-4" /></template>\n')
  assert.deepEqual(JSON.parse(run(cli, ["Page.vue", "--format", "json"])), [])
  writeFileSync(
    path.join(consumer, "Button.vue"),
    `<script setup lang="ts">type Size = 'sm' | 'lg'; defineProps<{size?: Size}>()</script><template><button /></template>`,
  )
  writeFileSync(
    path.join(consumer, "api.mjs"),
    `import assert from "node:assert/strict";
import { createLinter } from "selfix";
const linter = await createLinter({ css: '@import "tailwindcss";', root: process.cwd(), cssBase: '.' });
await assert.rejects(createLinter({ css: '', config: { exclude: [] } }), /only supported by the CLI/);
await assert.rejects(createLinter({ css: '', base: '.' }), /Use cssBase/);
assert.deepEqual(linter.lint('<template><div class="p-4" /></template>', 'Valid.vue'), []);
const source = '<script setup>const classes = "p-[13px]"</script>\\n<template><div :class="classes" /></template>';
const diagnostics = linter.lint(source, 'Bound.vue');
assert.equal(diagnostics.length, 1);
assert.equal(diagnostics[0].rule, 'no-arbitrary-values');
assert.equal(diagnostics[0].className, 'p-[13px]');
assert.equal(diagnostics[0].line, 2);
assert.equal(diagnostics[0].column, 16);
assert.equal(diagnostics[0].offset, source.indexOf(':class'));
const shorthand = linter.lint('<template><div :class /></template>', 'Shorthand.vue');
assert.ok(shorthand.some(d => d.rule === ${Number(versions.vue.split(".")[1]) >= 4 ? '"require-static-classes"' : '"parse-error"'}));
const projectLinter = await createLinter({ css: '@import "tailwindcss";', config: { components: ['^Button$'], project: {} } });
const projectSource = '<script setup>import Button from "./Button.vue"</script><template><Button class="p-4" /></template>';
const finding = projectLinter.lint(projectSource, 'Page.vue')[0];
assert.equal(finding.rule, 'no-restyle');
assert.equal(finding.file, 'Page.vue');
assert.deepEqual(finding.definition.props, { size: ['sm', 'lg'] });
assert.ok(finding.definition.file.endsWith('/Button.vue'));
`,
  )
  run(process.execPath, ["api.mjs"])
  console.log(`Packed selfix ${pkg.version} passed isolated consumer verification.`)
} finally {
  rmSync(consumer, { recursive: true, force: true })
}
