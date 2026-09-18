import { execFileSync, spawnSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, expect, it } from "vitest"

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const cli = fileURLToPath(new URL(`../${pkg.bin.selfix}`, import.meta.url))
const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

it("keeps the published bin entry available before the first build", () => {
  // pnpm cannot link workspace commands when their targets only exist after building.
  expect(pkg.bin.selfix).toBe("./bin/selfix.mjs")
  expect(pkg.files).toContain("bin")
  expect(readFileSync(cli, "utf8").startsWith("#!/usr/bin/env node")).toBe(true)
})

it("imports the compiled CLI with a nonexistent host argv[1]", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "selfix-import-"))
  dirs.push(dir)
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `process.argv[1] = ${JSON.stringify(path.join(dir, "nonexistent-host.mjs"))};
       const { run } = await import(${JSON.stringify(new URL("../dist/cli.js", import.meta.url).href)});
       if (typeof run !== "function") throw new Error("Missing run export");`,
    ],
    { encoding: "utf8" },
  )
  expect(result.stderr).toBe("")
  expect(result.stdout).toBe("")
  expect(result.status).toBe(0)
})

it("runs the declared executable through an npm-style symlink", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "selfix-bin-"))
  dirs.push(dir)
  const bin = path.join(dir, "selfix")
  symlinkSync(cli, bin)
  expect(execFileSync(process.execPath, [bin, "--help"], { encoding: "utf8" })).toContain(
    "Usage: selfix",
  )
  expect(execFileSync(process.execPath, [bin, "--version"], { encoding: "utf8" }).trim()).toBe(
    pkg.version,
  )
  writeFileSync(path.join(dir, "theme.css"), '@import "tailwindcss";')
  writeFileSync(path.join(dir, "package.json"), '{"type":"module"}')
  writeFileSync(
    path.join(dir, "selfix.config.ts"),
    'const css: string = "theme.css"; export default { css } satisfies { css: string }',
  )
  writeFileSync(path.join(dir, "Page.vue"), '<template><div class="p-[13px]" /></template>')
  const result = spawnSync(process.execPath, [bin, "Page.vue", "--format", "json"], {
    cwd: dir,
    encoding: "utf8",
  })
  expect(result.status).toBe(1)
  expect(JSON.parse(result.stdout)[0]).toMatchObject({ rule: "no-arbitrary-values" })
})

it("publishes only the two requested consumer peer dependencies", () => {
  expect(pkg.dependencies).toBeUndefined()
  expect(Object.keys(pkg.peerDependencies).sort()).toEqual(["tailwindcss", "vue"])
})

it("reports a missing Vue compiler capability with upgrade guidance", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "selfix-compiler-"))
  dirs.push(dir)
  cpSync(new URL("../dist", import.meta.url), path.join(dir, "dist"), { recursive: true })
  writeFileSync(path.join(dir, "package.json"), '{"type":"module"}')
  const vue = path.join(dir, "node_modules/vue")
  mkdirSync(vue, { recursive: true })
  writeFileSync(path.join(vue, "package.json"), '{"version":"3.2.13"}')
  // Control only the unavailable-capability boundary, not parser behavior.
  writeFileSync(
    path.join(vue, "compiler-sfc.js"),
    "exports.parse = () => {}; exports.compileTemplate = () => {};",
  )
  const result = spawnSync(process.execPath, ["dist/vue.js"], { cwd: dir, encoding: "utf8" })
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain(
    "Vue 3.2.13 compiler is missing required capabilities: babelParse",
  )
  expect(result.stderr).toContain("Reinstall a supported Vue version (>=3.2.13 <4)")
})

it.each([false, true])(
  "smoke accepts an aliased temporary parent but rejects a package link: %s",
  (linked) => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "selfix-smoke-path-"))
    dirs.push(dir)
    const parent = path.join(dir, "real")
    mkdirSync(parent)
    const alias = path.join(dir, "alias")
    symlinkSync(parent, alias)
    const external = path.join(dir, "external-package")
    mkdirSync(external)
    const bin = path.join(dir, "bin")
    mkdirSync(bin)
    // Replace only npm's network/install boundary. A sentinel package error proves
    // the real smoke script passed its filesystem isolation check.
    writeFileSync(
      path.join(bin, "npm"),
      `#!${process.execPath}
const fs = require('node:fs');
fs.mkdirSync('node_modules', {recursive:true});
${linked ? `fs.symlinkSync(${JSON.stringify(external)}, 'node_modules/selfix');` : "fs.mkdirSync('node_modules/selfix');"}
fs.writeFileSync('node_modules/selfix/package.json', JSON.stringify({peerDependencies:{sentinel:'1'}}));
`,
      { mode: 0o755 },
    )
    const archive = path.join(dir, "fixture.tgz")
    writeFileSync(archive, "network boundary replaced")
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("../scripts/smoke-install.mjs", import.meta.url)), archive],
      {
        encoding: "utf8",
        env: { ...process.env, TMPDIR: alias, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
      },
    )
    expect(result.status).toBe(1)
    if (linked) expect(result.stderr).toContain("selfix must be installed, not workspace-linked")
    else {
      expect(result.stderr).not.toContain("selfix must be installed, not workspace-linked")
      expect(result.stderr).toContain("sentinel")
    }
    const consumer = result.stdout.match(/Consumer: (.*?); Node/)?.[1]
    expect(consumer).toBeDefined()
    expect(existsSync(consumer!)).toBe(false)
  },
)
