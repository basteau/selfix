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
    `<script setup lang="ts">defineProps<{size?: 'sm' | 'lg'; variant?: 'solid' | 'outline'}>()</script><template><button /></template>`,
  )
  const css = '@import "tailwindcss";\n@import "@nuxt/ui";\n'
  const source = '<template><div class="bg-selfixbrand" /></template>\n'
  writeFileSync(path.join(consumer, "app/assets/css/main.css"), css)
  writeFileSync(path.join(consumer, "app/app.vue"), source)
  writeFileSync(
    path.join(consumer, "selfix.config.ts"),
    'export default { css: "app/assets/css/main.css", cssAliases: { "#build/ui.css": ".nuxt/ui.css" }, components: ["^U", "^LocalChoice$"], classProps: [{ pattern: "^UButton$", props: { ui: "slot-map" } }] }',
  )
  run(process.execPath, ["node_modules/nuxt/bin/nuxt.mjs", "prepare"])
  const generated = path.join(consumer, ".nuxt/ui.css")
  const fallback = path.join(consumer, "node_modules/@nuxt/ui/.nuxt/ui.static.css")
  assert.match(readFileSync(generated, "utf8"), /--color-selfixbrand:/)
  assert.doesNotMatch(readFileSync(fallback, "utf8"), /--color-selfixbrand:/)
  const base = path.join(consumer, "app/assets/css")
  const appLinter = await createLinter({
    css,
    root: consumer,
    cssBase: base,
    config: { cssAliases: { "#build/ui.css": generated } },
  })
  assert.deepEqual(appLinter.lint(source), [])
  const fallbackLinter = await createLinter({
    css,
    root: consumer,
    cssBase: base,
    config: { cssAliases: { "#build/ui.css": fallback } },
  })
  assert.deepEqual(
    fallbackLinter.lint(source).map(({ rule, className }) => ({ rule, className })),
    [{ rule: "no-unknown-classes", className: "bg-selfixbrand" }],
  )
  const cli = fileURLToPath(new URL("../bin/selfix.mjs", import.meta.url))
  const args = [cli, "--config", "../selfix.config.ts", "--format", "json", "app.vue"]
  const cwd = path.join(consumer, "app")
  assert.deepEqual(JSON.parse(run(process.execPath, args, 0, cwd).stdout), [])
  const failing = `<template>
  <UButton class="bg-red-500" :ui="{ leadingIcon: 'p-4' }" />
  <LocalChoice class="rounded-lg" />
  <div class="bg-selfixbrand" />
</template>\n`
  const page = path.join(consumer, "app/app.vue")
  writeFileSync(page, failing)
  const findings = JSON.parse(run(process.execPath, args, 1, cwd).stdout)
  assert.equal(findings.length, 4)
  const buttonFile = path.join(consumer, "node_modules/@nuxt/ui/dist/runtime/components/Button.vue")
  const localFile = path.join(consumer, "app/components/Choice.vue")
  assert.deepEqual(
    findings.map(({ rule, component, className, file, line, column, prop, slot, definition }) => ({
      rule,
      component,
      className,
      file,
      line,
      column,
      prop,
      slot,
      definition,
    })),
    [
      {
        rule: "no-raw-colors",
        component: "UButton",
        className: "bg-red-500",
        file: page,
        line: 2,
        column: 12,
        prop: undefined,
        slot: undefined,
        definition: undefined,
      },
      {
        rule: "no-restyle",
        component: "UButton",
        className: "bg-red-500",
        file: page,
        line: 2,
        column: 12,
        prop: undefined,
        slot: undefined,
        definition: { file: buttonFile },
      },
      {
        rule: "no-restyle",
        component: "UButton",
        className: "p-4",
        file: page,
        line: 2,
        column: 31,
        prop: "ui",
        slot: "leadingIcon",
        definition: { file: buttonFile },
      },
      {
        rule: "no-restyle",
        component: "LocalChoice",
        className: "rounded-lg",
        file: page,
        line: 3,
        column: 16,
        prop: undefined,
        slot: undefined,
        definition: {
          file: localFile,
          props: { size: ["sm", "lg"], variant: ["solid", "outline"] },
        },
      },
    ],
  )
  assert.match(findings[3].message, /Accepted size values: "sm", "lg"/)
  assert.doesNotMatch(findings[1].message, /Accepted (size|variant) values/)
  writeFileSync(
    page,
    `<template><UButton :ui="{ leadingIcon: 'mr-2' }" /><LocalChoice size="sm" variant="solid" /><div class="bg-selfixbrand" /></template>`,
  )
  assert.deepEqual(JSON.parse(run(process.execPath, args, 0, cwd).stdout), [])
  rmSync(generated)
  const missing = run(process.execPath, args, 2, cwd)
  assert.ok(missing.stderr.includes(generated))
  assert.match(missing.stderr, /nuxt prepare/)
  console.log(
    "Nuxt generated theme, prepared component discovery, slot findings, corrected source, CLI paths, and missing-file checks passed.",
  )
} finally {
  rmSync(consumer, { recursive: true, force: true })
}
