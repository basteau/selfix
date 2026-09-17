import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
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
