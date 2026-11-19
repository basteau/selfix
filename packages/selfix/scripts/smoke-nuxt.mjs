import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createLinter } from "../dist/index.js"

const versions = { "@nuxt/ui": "4.11.1", nuxt: "4.5.2", tailwindcss: "4.3.3", vue: "3.5.42" }
const consumer = realpathSync(mkdtempSync(path.join(tmpdir(), "selfix-nuxt-")))
const env = { ...process.env, NUXT_TELEMETRY_DISABLED: "1" }
delete env.NODE_PATH
delete env.NODE_OPTIONS

function run(command, args, expected = 0, cwd = consumer) {
  console.log(`> ${command} ${args.join(" ")}`)
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8", timeout: 300_000 })
  assert.ifError(result.error)
  assert.equal(result.status, expected, `${result.stdout}\n${result.stderr}`)
  return result
}

try {
  console.log(`Nuxt integration: Node ${process.version}; ${JSON.stringify(versions)}`)
  writeFileSync(
    path.join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module", dependencies: versions }),
  )
  // Network access is intentional; framework dependencies stay in this temporary app.
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"])
  writeFileSync(
    path.join(consumer, "nuxt.config.ts"),
    `export default defineNuxtConfig({
      modules: ["@nuxt/ui"],
      css: ["~/assets/css/main.css"],
      telemetry: false,
      components: [{ path: "~/components", prefix: "Local" }],
      ui: { fonts: false, theme: {
        colors: ["primary", "secondary", "success", "info", "warning", "error", "selfixbrand"],
      } },
    })`,
  )
  mkdirSync(path.join(consumer, "app/assets/css"), { recursive: true })
  mkdirSync(path.join(consumer, "app/components"), { recursive: true })
  writeFileSync(
    path.join(consumer, "app/components/Choice.vue"),
    "<template><UButton /></template>",
  )
  const css = '@import "tailwindcss";\n@import "@nuxt/ui";\n'
  const source =
    '<template><div class="bg-selfixbrand text-muted border-neutral-200" /></template>\n'
  const page = path.join(consumer, "app/app.vue")
  writeFileSync(path.join(consumer, "app/assets/css/main.css"), css)
  writeFileSync(page, source)
  run(process.execPath, ["node_modules/nuxt/bin/nuxt.mjs", "prepare"])
  const generated = path.join(consumer, ".nuxt/ui.css")
  // The application's theme, not the package fallback, declares the custom color.
  assert.match(readFileSync(generated, "utf8"), /--color-selfixbrand:/)

  // No configuration: the stylesheet, the generated theme, and the components are found.
  const linter = await createLinter({ root: consumer })
  assert.equal(linter.nuxtUi, true)
  assert.deepEqual(linter.lint(source), [])
  const cli = fileURLToPath(new URL("../bin/selfix.mjs", import.meta.url))
  const args = [cli, "app", "--format", "json"]
  const clean = run(process.execPath, args)
  assert.equal(clean.stderr, "")
  assert.deepEqual(JSON.parse(clean.stdout).diagnostics, [])

  writeFileSync(
    page,
    `<template>
  <UButton class="bg-red-500" :ui="{ leadingIcon: 'p-4' }" />
  <LazyUCard class="mt-4" :ui="{ body: 'font-bold' }" />
  <LocalChoice class="rounded-lg" />
  <button type="button">Native</button>
  <div class="text-gray-500 bg-prmary" />
</template>\n`,
  )
  writeFileSync(
    path.join(consumer, "selfix.config.ts"),
    'export default { components: ["^LocalChoice$"] }\n',
  )
  const findings = JSON.parse(run(process.execPath, args, 1).stdout).diagnostics
  assert.deepEqual(
    findings.map(({ rule, component, className, file, line, column, prop, slot }) => ({
      rule,
      component,
      className,
      file,
      line,
      column,
      prop,
      slot,
    })),
    [
      ["no-raw-colors", "UButton", "bg-red-500", 2, 12],
      ["no-restyle", "UButton", "bg-red-500", 2, 12],
      ["no-restyle", "UButton", "p-4", 2, 31, "ui", "leadingIcon"],
      ["no-restyle", "LazyUCard", "font-bold", 3, 27, "ui", "body"],
      ["no-restyle", "LocalChoice", "rounded-lg", 4, 16],
      ["prefer-ui-components", "button", undefined, 5, 3],
      ["no-raw-colors", "div", "text-gray-500", 6, 8],
      ["no-unknown-classes", "div", "bg-prmary", 6, 8],
    ].map(([rule, component, className, line, column, prop, slot]) => ({
      rule,
      component,
      className,
      file: page,
      line,
      column,
      prop,
      slot,
    })),
  )
  const message = (index) => findings[index].message
  assert.match(message(1), /Use color \(primary, .*selfixbrand.*\) or variant \(solid, /)
  assert.match(message(1), /under ui\.button in app\.config\.ts/)
  assert.match(message(2), /In ui\.leadingIcon\.$/)
  assert.match(message(5), /^Use <UButton> instead of a native <button>/)
  assert.match(message(6), /such as text-dimmed, text-muted, text-toned, text-default/)
  assert.deepEqual(findings[7].suggestions, ["bg-primary"])

  writeFileSync(
    page,
    `<template><UButton color="error" :ui="{ leadingIcon: 'me-2' }" /><LocalChoice class="mt-4" /><div class="bg-selfixbrand" /></template>`,
  )
  assert.deepEqual(JSON.parse(run(process.execPath, args).stdout).diagnostics, [])
  rmSync(generated)
  const missing = run(process.execPath, args, 2)
  assert.ok(missing.stderr.includes(consumer))
  assert.match(missing.stderr, /nuxt prepare/)
  console.log(
    "Zero-config Nuxt UI discovery, the generated theme, slot findings, guidance, corrected source, and the unprepared-project failure passed.",
  )
} finally {
  rmSync(consumer, { recursive: true, force: true })
}
