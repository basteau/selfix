import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createLinter } from "../dist/index.js"

const versions = { "@nuxt/ui": "4.11.1", nuxt: "4.5.2", tailwindcss: "4.3.3", vue: "3.5.42" }
const consumer = mkdtempSync(path.join(tmpdir(), "selfix-nuxt-"))
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
      ui: { fonts: false, theme: {
        colors: ["primary", "secondary", "success", "info", "warning", "error", "selfixbrand"],
      } },
    })`,
  )
  mkdirSync(path.join(consumer, "app/assets/css"), { recursive: true })
  const css = '@import "tailwindcss";\n@import "@nuxt/ui";\n'
  const source = '<template><div class="bg-selfixbrand" /></template>\n'
  writeFileSync(path.join(consumer, "app/assets/css/main.css"), css)
  writeFileSync(path.join(consumer, "app/app.vue"), source)
  writeFileSync(
    path.join(consumer, "selfix.config.ts"),
    'export default { css: "app/assets/css/main.css", cssAliases: { "#build/ui.css": ".nuxt/ui.css" } }',
  )
  run(process.execPath, ["node_modules/nuxt/bin/nuxt.mjs", "prepare"])
  const generated = path.join(consumer, ".nuxt/ui.css")
  const fallback = path.join(consumer, "node_modules/@nuxt/ui/.nuxt/ui.static.css")
  assert.match(readFileSync(generated, "utf8"), /--color-selfixbrand:/)
  assert.doesNotMatch(readFileSync(fallback, "utf8"), /--color-selfixbrand:/)
  const base = path.join(consumer, "app/assets/css")
  const appLinter = await createLinter({
    css,
    base,
    config: { cssAliases: { "#build/ui.css": generated } },
  })
  assert.deepEqual(appLinter.lint(source), [])
  const fallbackLinter = await createLinter({
    css,
    base,
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
  rmSync(generated)
  const missing = run(process.execPath, args, 2, cwd)
  assert.ok(missing.stderr.includes(generated))
  assert.match(missing.stderr, /nuxt prepare/)
  console.log(
    "Nuxt generated theme, fallback distinction, CLI paths, and missing-file checks passed.",
  )
} finally {
  rmSync(consumer, { recursive: true, force: true })
}
