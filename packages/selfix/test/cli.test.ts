import { mkdtemp, mkdir, readFile, rm, writeFile, symlink, chmod } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { run } from "../src/cli.js"
import { installNuxtUi } from "./nuxt-ui-fixture.js"

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
async function project() {
  // Under the workspace so Tailwind's package imports resolve normally.
  const dir = await mkdtemp(path.join(process.cwd(), ".selfix-test-"))
  dirs.push(dir)
  installNuxtUi(dir)
  await writeFile(path.join(dir, "theme.css"), '@import "tailwindcss";')
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    'const css: string = "theme.css"; export default { css }',
  )
  return dir
}
async function invoke(args: string[], dir: string) {
  let stdout = ""
  let stderr = ""
  const code = await run(args, dir, {
    out: (text) => {
      stdout += text
      return true
    },
    err: (text) => {
      stderr += text
      return true
    },
  })
  return { code, stdout, stderr }
}

describe("CLI", () => {
  it("prints advisory spelling suggestions in text and JSON without changing files", async () => {
    const dir = await project()
    const source = '<template><div class="flex-cols" /></template>'
    const file = path.join(dir, "Example.vue")
    await writeFile(file, source)
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      `export default { css: 'theme.css', rules: { 'no-unknown-classes': ['error', {message: 'Custom guidance'}] } }`,
    )
    const json = await invoke(["--format", "json", "Example.vue"], dir)
    expect(json.code).toBe(1)
    expect(JSON.parse(json.stdout).diagnostics).toEqual([
      expect.objectContaining({ message: "Custom guidance", suggestions: ["flex-col"] }),
    ])
    const text = await invoke(["Example.vue"], dir)
    expect(text.code).toBe(1)
    expect(text.stdout).toContain('Custom guidance Did you mean "flex-col"?')
    expect(await readFile(file, "utf8")).toBe(source)
  })
  it("deduplicates overlapping selections and preserves explicit versus nested symlinks", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "src"))
    await mkdir(path.join(dir, "outside"))
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      `export default {css:'theme.css',components:['^Button$'],exclude:['src/Skip.vue']}`,
    )
    const source = '<template><Button class="p-4" /></template>'
    await writeFile(path.join(dir, "src/Page.vue"), source)
    await writeFile(path.join(dir, "src/Skip.vue"), source)
    await writeFile(path.join(dir, "outside/Other.vue"), source)
    await symlink(path.join(dir, "outside"), path.join(dir, "src/linked"), "dir")
    await symlink(path.join(dir, "outside/Other.vue"), path.join(dir, "src/Link.vue"))
    const args = ["--format", "json"]
    const single = await invoke([...args, "src"], dir)
    const overlapping = await invoke([...args, "src", "src/Page.vue", "src/*.vue"], dir)
    // The glob explicitly selects Link.vue, unlike recursive enumeration.
    const explicit = await invoke([...args, "src", "src/Link.vue"], dir)
    expect(overlapping).toEqual(explicit)
    expect(single.stderr).toBe("")
    expect(
      JSON.parse(single.stdout).diagnostics.map((item: { file: string }) =>
        path.basename(item.file),
      ),
    ).toEqual(["Page.vue"])
    expect(
      JSON.parse(explicit.stdout).diagnostics.map((item: { file: string }) =>
        path.basename(item.file),
      ),
    ).toEqual(["Link.vue", "Page.vue"])
    expect(await invoke([...args, "src/linked"], dir)).toEqual(
      await invoke([...args, "src/linked/Other.vue"], dir),
    )
    await rm(path.join(dir, "outside/Other.vue"))
    const unavailable = await invoke(["src/Link.vue"], dir)
    expect(unavailable.code).toBe(2)
    expect(unavailable.stderr).toMatch(/ENOENT|No files match/)
  })
  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "fails closed for unreadable requested directories and enumerated sources",
    async () => {
      const dir = await project()
      const src = path.join(dir, "src")
      const file = path.join(src, "Page.vue")
      await mkdir(src)
      await writeFile(file, "<template><div /></template>")
      for (const target of [file, src]) {
        await chmod(target, 0)
        try {
          const result = await invoke(["src"], dir)
          expect(result.code).toBe(2)
          expect(result.stderr).toContain("EACCES")
          expect(result.stderr).toContain(target)
        } finally {
          await chmod(target, target === src ? 0o700 : 0o600)
        }
      }
    },
  )

  it("reports component restrictions in text/JSON and applies warning limits and coverage errors", async () => {
    const dir = await project()
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      `export default {
      css: 'theme.css', rules: { 'no-restricted-components': ['warn', {
        components: [{name: 'CustomButton', replacement: 'UButton'}]
      }] }
    }`,
    )
    const file = path.join(dir, "Page.vue")
    await writeFile(file, "<template><CustomButton/></template>")
    const text = await invoke([], dir)
    expect(text.code).toBe(0)
    expect(text.stdout).toContain("no-restricted-components")
    expect(text.stdout).toContain("<CustomButton> is restricted. Use <UButton> instead.")
    const json = await invoke(["--format", "json"], dir)
    expect(json.code).toBe(0)
    expect(JSON.parse(json.stdout).diagnostics).toEqual([
      expect.objectContaining({
        file,
        rule: "no-restricted-components",
        severity: "warn",
        component: "CustomButton",
        line: 1,
        column: 11,
        offset: 10,
      }),
    ])
    expect((await invoke(["--max-warnings", "0"], dir)).code).toBe(1)
    await writeFile(file, '<template><component :is="choice"/></template>')
    const coverage = await invoke(["--format", "json"], dir)
    expect(coverage.code).toBe(1)
    expect(JSON.parse(coverage.stdout).diagnostics).toEqual([
      expect.objectContaining({
        rule: "parse-error",
        severity: "error",
        offset: 10,
      }),
    ])
    await writeFile(
      path.join(dir, "invalid.config.ts"),
      `export default {
      css: 'theme.css', rules: { 'no-restricted-components': ['error', { allow: ['Button'] }] }
    }`,
    )
    expect(await invoke(["--config", "invalid.config.ts"], dir)).toMatchObject({
      code: 2,
      stderr: expect.stringContaining("Unknown no-restricted-components option"),
    })
  })

  it("reports a renamed import restriction in text and JSON", async () => {
    const dir = await project()
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      `export default {
      css: 'theme.css', rules: { 'no-restricted-components': ['error', {
        imports: [{ source: 'some-ui', name: 'CustomButton', replacement: 'UButton' }]
      }] }
    }`,
    )
    const file = path.join(dir, "Page.vue")
    await writeFile(
      file,
      `<script setup>
import { CustomButton as LegacyButton } from "some-ui"
</script>
<template>
  <LegacyButton />
</template>`,
    )
    const text = await invoke([], dir)
    expect(text.code).toBe(1)
    expect(text.stdout).toContain("no-restricted-components")
    expect(text.stdout).toContain("<LegacyButton> is restricted. Use <UButton> instead.")
    const json = await invoke(["--format", "json"], dir)
    expect(json.code).toBe(1)
    expect(JSON.parse(json.stdout).diagnostics).toEqual([
      expect.objectContaining({
        file,
        rule: "no-restricted-components",
        severity: "error",
        component: "LegacyButton",
        line: 5,
        column: 3,
      }),
    ])
  })

  it("applies config-relative file rules while retaining exclusions, failures, and warning limits", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "src/ui"), { recursive: true })
    await mkdir(path.join(dir, "src/ignored"))
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      `export default {
      css:'theme.css', exclude:['src/ignored/**'],
      overrides:[{files:['src/ui/**/*.vue'],rules:{'no-inline-styles':'off','no-raw-colors':'warn'}}]
    }`,
    )
    await writeFile(
      path.join(dir, "src/ui/Button.vue"),
      '<template><div style="padding: 4px" class="bg-red-500 missing-class" /></template>',
    )
    await writeFile(path.join(dir, "src/ignored/Bad.vue"), "<template><div></template>")
    await writeFile(
      path.join(dir, "src/Page.vue"),
      '<template><div style="padding: 4px" /></template>',
    )
    const args = ["--config", "../selfix.config.ts", "--format", "json"]
    const result = await invoke(args, path.join(dir, "src"))
    expect(result.stderr).toBe("")
    expect(result.code).toBe(1)
    expect(
      JSON.parse(result.stdout).diagnostics.map(
        ({ rule, severity, file }: { rule: string; severity: string; file: string }) => ({
          rule,
          severity,
          file,
        }),
      ),
    ).toEqual([
      { rule: "no-inline-styles", severity: "error", file: path.join(dir, "src/Page.vue") },
      { rule: "no-raw-colors", severity: "warn", file: path.join(dir, "src/ui/Button.vue") },
      { rule: "no-unknown-classes", severity: "error", file: path.join(dir, "src/ui/Button.vue") },
    ])
    await writeFile(path.join(dir, "src/Page.vue"), "<template><div /></template>")
    await writeFile(
      path.join(dir, "src/ui/Button.vue"),
      '<template><div style="padding: 4px" class="bg-red-500" /></template>',
    )
    expect((await invoke(args, path.join(dir, "src"))).code).toBe(0)
    expect((await invoke([...args, "--max-warnings", "0"], path.join(dir, "src"))).code).toBe(1)
    await writeFile(
      path.join(dir, "invalid.config.ts"),
      `export default {css:'theme.css', overrides:[{files:['../**'],rules:{'no-inline-styles':'off'}}]}`,
    )
    expect(await invoke(["--config", "../invalid.config.ts"], path.join(dir, "src"))).toMatchObject(
      { code: 2, stderr: expect.stringContaining("Invalid file pattern") },
    )
  })
  it("loads the generated Nuxt UI theme from the config directory and fails when it is missing", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "app"))
    await writeFile(path.join(dir, "app/main.css"), '@import "tailwindcss"; @import "@nuxt/ui";')
    await writeFile(path.join(dir, "selfix.config.ts"), 'export default { css: "app/main.css" }')
    await writeFile(
      path.join(dir, "app/Page.vue"),
      '<template><UButton class="mt-4 text-muted" /></template>',
    )
    const args = ["--config", "../selfix.config.ts", "--format", "json"]
    const result = await invoke(args, path.join(dir, "app"))
    expect(result.stderr).toBe("")
    expect(result.code).toBe(1)
    expect(JSON.parse(result.stdout).diagnostics).toEqual([
      expect.objectContaining({
        rule: "no-restyle",
        component: "UButton",
        className: "text-muted",
        file: path.join(dir, "app/Page.vue"),
      }),
    ])
    await rm(path.join(dir, ".nuxt/ui.css"))
    const missing = await invoke(args, path.join(dir, "app"))
    expect(missing.code).toBe(2)
    expect(missing.stdout).toBe("")
    expect(missing.stderr).toContain(dir)
    expect(missing.stderr).toContain("nuxt prepare")
  })
  it("runs without a config file, finding the stylesheet from the working directory", async () => {
    const dir = await project()
    await rm(path.join(dir, "selfix.config.ts"))
    await writeFile(path.join(dir, "Page.vue"), '<template><button class="p-[13px]" /></template>')
    const result = await invoke([], dir)
    expect(result.stderr).toBe("")
    expect(result.code).toBe(1)
    expect(result.stdout).toBe(
      `Page.vue:1:11 error prefer-ui-components Use <UButton> instead of a native <button>, so it follows the design system.
Page.vue:1:19 error no-arbitrary-values Replace "p-[13px]" with a named theme utility instead of an arbitrary value.
Checked 1 Vue file: 2 errors, 0 warnings.
`,
    )
    await writeFile(path.join(dir, "second.css"), '@import "tailwindcss";')
    expect(await invoke([], dir)).toMatchObject({
      code: 2,
      stderr: expect.stringContaining("Choose one with css in selfix.config.ts"),
    })
  })
  it("says so when Nuxt UI is not installed, and still checks the project", async () => {
    const dir = await project()
    await rm(path.join(dir, "node_modules"), { recursive: true })
    await rm(path.join(dir, ".nuxt"), { recursive: true })
    await writeFile(path.join(dir, "Page.vue"), '<template><UButton class="p-[13px]" /></template>')
    const result = await invoke(["--format", "json"], dir)
    expect(result.code).toBe(1)
    expect(result.stderr).toBe(
      `selfix: Nuxt UI was not found in ${dir}; only components named in the config are protected.\n`,
    )
    expect(JSON.parse(result.stdout).diagnostics.map(({ rule }: { rule: string }) => rule)).toEqual(
      ["no-arbitrary-values"],
    )
  })
  it("finds Vue files, prints actionable positions, and exits nonzero", async () => {
    const dir = await project()
    await writeFile(
      path.join(dir, "Page.vue"),
      '<template>\n  <div class="p-[13px]" />\n</template>',
    )
    const result = await invoke([], dir)
    expect(result.code).toBe(1)
    expect(result.stdout).toMatch(/Page.vue:2:\d+ error no-arbitrary-values/)
    expect(result.stderr).toBe("")
    expect(await readFile(path.join(dir, "Page.vue"), "utf8")).toContain('class="p-[13px]"')
  })
  it("outputs deterministic JSON and deduplicates glob inputs", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "Page.vue"), '<template><div class="rounded-huge" /></template>')
    const result = await invoke(["*.vue", "Page.vue", "--format", "json"], dir)
    expect(result.code).toBe(1)
    const diagnostics = JSON.parse(result.stdout).diagnostics
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      rule: "no-unknown-classes",
      file: path.join(dir, "Page.vue"),
    })
  })
  it("skips excluded and generated directories", async () => {
    const dir = await project()
    for (const name of ["dist", "node_modules", "generated"]) {
      await mkdir(path.join(dir, name), { recursive: true })
      await writeFile(
        path.join(dir, name, "Broken.vue"),
        '<template><div class="nonsense" /></template>',
      )
    }
    await writeFile(path.join(dir, "Page.vue"), '<template><div class="p-4" /></template>')
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "theme.css", exclude: ["**/generated/**"] }',
    )
    const result = await invoke([], dir)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("Checked 1 Vue file: 0 errors")
  })
  it("loads typed config and resolves its CSS relative to the config file", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "app"))
    await writeFile(path.join(dir, "app", "Page.vue"), '<template><div class="p-4" /></template>')
    await writeFile(path.join(dir, "selfix.config.ts"), 'export default { css: "theme.css" }')
    expect((await invoke(["--config", "../selfix.config.ts"], path.join(dir, "app"))).code).toBe(0)
  })
  it("enforces optional warning thresholds", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "Page.vue"), '<template><div class="p-[13px]" /></template>')
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "theme.css", rules: { "no-arbitrary-values": "warn" } }',
    )
    expect((await invoke([], dir)).code).toBe(0)
    expect((await invoke(["--max-warnings", "0"], dir)).code).toBe(1)
  })
  it("fails closed for missing input, invalid config and theme failures", async () => {
    const dir = await project()
    expect((await invoke([], dir)).code).toBe(2)
    expect((await invoke(["missing.vue"], dir)).stderr).toContain("No files match")
    expect((await invoke(["--unknown"], dir)).code).toBe(2)
    expect((await invoke(["--format", "yaml"], dir)).code).toBe(2)
    await writeFile(path.join(dir, "Page.vue"), "<template><div /></template>")
    await writeFile(path.join(dir, "theme.css"), '@import "./missing.css";')
    expect((await invoke([], dir)).code).toBe(2)
    await writeFile(path.join(dir, "invalid.ts"), "export default { typo: true }")
    expect((await invoke(["--config", "invalid.ts"], dir)).stderr).toContain("Unknown config")
  })
  it("shows help without loading a project", async () => {
    const result = await invoke(["--help"], os.tmpdir())
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("Usage: selfix")
  })
  it("accepts only a TypeScript config and never falls back from a named one", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "selfix.config.json"), '{"css":"theme.css"}')
    for (const extension of ["json", "js", "mjs"]) {
      const result = await invoke(["--config", `selfix.config.${extension}`], dir)
      expect(result.code).toBe(2)
      expect(result.stderr).toContain("Configuration must be a .ts file")
    }
    expect(await invoke(["--config", "missing.config.ts"], dir)).toMatchObject({
      code: 2,
      stderr: `selfix: Configuration not found: ${path.join(dir, "missing.config.ts")}.\n`,
    })
    // Beside a real config, other files with that stem are not configs.
    await writeFile(path.join(dir, "selfix.config.bak"), "old")
    await writeFile(path.join(dir, "Page.vue"), "<template><div /></template>")
    expect(await invoke([], dir)).toMatchObject({ code: 0, stderr: "" })
    await rm(path.join(dir, "selfix.config.ts"))
    expect(await invoke([], dir)).toMatchObject({
      code: 2,
      stderr: "selfix: Found selfix.config.json. Configuration must be named selfix.config.ts.\n",
    })
    await rm(path.join(dir, "selfix.config.json"))
    expect(await invoke([], dir)).toMatchObject({ code: 0, stderr: "" })
    for (const removed of ["--doctor", "--css"])
      expect((await invoke([removed], dir)).stderr).toBe(`selfix: Unknown option: ${removed}.\n`)
  })
  it("reports a missing default export and invalid TypeScript", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "named.ts"), 'export const config = { css: "theme.css" }')
    expect((await invoke(["--config", "named.ts"], dir)).stderr).toContain(
      "config must be an object",
    )
    await writeFile(path.join(dir, "broken.ts"), "export default { css:")
    expect((await invoke(["--config", "broken.ts"], dir)).code).toBe(2)
  })
})

it("uses config-relative full-path globs for exclusions, including dot and zero-directory matches", async () => {
  const dir = await project()
  const files = [
    "Page.vue",
    "generated/Bad.vue",
    "src/generated/Bad.vue",
    "src/.hidden/Skip1.vue",
    "src/Skip2.vue",
    "src/Keep.vue",
  ]
  for (const file of files) {
    await mkdir(path.dirname(path.join(dir, file)), { recursive: true })
    await writeFile(
      path.join(dir, file),
      file.endsWith("Keep.vue") || file === "Page.vue"
        ? "<template><div /></template>"
        : "<template><div></template>",
    )
  }
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default {css:'theme.css',exclude:['**/generated/**','src/**/Skip?.vue'],overrides:[{files:['**/*.vue'],rules:{'no-inline-styles':'off'}}]}`,
  )
  expect(await invoke(["--config", "../selfix.config.ts", ".."], path.join(dir, "src"))).toEqual({
    code: 0,
    stdout: "Checked 2 Vue files: 0 errors, 0 warnings.\n",
    stderr: "",
  })
  expect((await invoke(["generated/Bad.vue"], dir)).stderr).toContain("No Vue files found")
  expect((await invoke(["**/*.vue"], dir)).code).toBe(0)
})

it.each([
  ["generated", "**/generated/**"],
  ["src/generated", "src/generated/**"],
  ["src/{a,b}.vue", "relative paths"],
  ["../*.vue", "relative paths"],
])("rejects ambiguous or unsupported exclusion %s with guidance", async (pattern, guidance) => {
  const dir = await project()
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default {css:'theme.css',exclude:[${JSON.stringify(pattern)}]}`,
  )
  const result = await invoke([], dir)
  expect(result.code).toBe(2)
  expect(result.stderr).toContain(guidance)
})

it("keeps exact exclusions scoped to the config root, including explicit outside-root files", async () => {
  const dir = await project()
  await mkdir(path.join(dir, "app"))
  await writeFile(
    path.join(dir, "app/selfix.config.ts"),
    `export default {css:'../theme.css',buildDir:'../.nuxt',exclude:['**/Page.vue']}`,
  )
  for (const file of ["Page.vue", "app/Page.vue"])
    await writeFile(path.join(dir, file), '<template><div style="color:red" /></template>')
  const result = await invoke(
    ["--config", "app/selfix.config.ts", "Page.vue", "app/Page.vue", "--format", "json"],
    dir,
  )
  expect(result.code).toBe(1)
  expect(JSON.parse(result.stdout).diagnostics).toEqual([
    expect.objectContaining({ file: path.join(dir, "Page.vue"), rule: "no-inline-styles" }),
  ])
})

it("does not treat a matching directory as a file-prefix exclusion", async () => {
  const dir = await project()
  await mkdir(path.join(dir, "src/nested"), { recursive: true })
  await writeFile(path.join(dir, "src/nested/Page.vue"), "<template><div /></template>")
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default {css:'theme.css',exclude:['src/*']}`,
  )
  for (const input of ["src", "src/**/*.vue"])
    expect((await invoke([input], dir)).stdout).toBe("Checked 1 Vue file: 0 errors, 0 warnings.\n")
})
it("reports opaque v-bind spreads through configurable require-static-classes", async () => {
  const dir = await project()
  await mkdir(path.join(dir, "src/ui"), { recursive: true })
  const source = '<template><div v-bind="$attrs" /><div v-bind="attrs" /></template>'
  await writeFile(path.join(dir, "src/Page.vue"), source)
  await writeFile(path.join(dir, "src/ui/Wrapper.vue"), source)
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default { css: 'theme.css', overrides: [{ files: ['src/ui/**'], rules: { 'require-static-classes': 'warn' } }] }`,
  )
  const json = await invoke(["--format", "json", "src"], dir)
  expect(json.stderr).toBe("")
  expect(json.code).toBe(1)
  const offset = source.indexOf('v-bind="attrs"')
  expect(JSON.parse(json.stdout).diagnostics).toEqual([
    {
      file: path.join(dir, "src/Page.vue"),
      rule: "require-static-classes",
      severity: "error",
      message:
        "Cannot statically inspect the v-bind spread on <div>; it may pass class or style. Bind class and style as explicit attributes, or spread a literal object.",
      line: 1,
      column: offset + 1,
      offset,
      component: "div",
    },
    expect.objectContaining({
      file: path.join(dir, "src/ui/Wrapper.vue"),
      rule: "require-static-classes",
      severity: "warn",
      offset,
    }),
  ])
  expect((await invoke(["src/ui"], dir)).code).toBe(0)
  await writeFile(
    path.join(dir, "off.config.ts"),
    `export default { css: 'theme.css', rules: { 'require-static-classes': 'off' } }`,
  )
  const off = await invoke(["--config", "off.config.ts", "--format", "json", "src"], dir)
  expect(off.code).toBe(0)
  expect(JSON.parse(off.stdout).diagnostics).toEqual([])
})

describe("GitLab Code Quality format", () => {
  async function gitlab(source: string, dir?: string) {
    if (!dir) {
      dir = await project()
      await mkdir(path.join(dir, "src"))
      await writeFile(
        path.join(dir, "selfix.config.ts"),
        'export default { css: "theme.css", rules: { "no-inline-styles": "warn" } }',
      )
    }
    await writeFile(path.join(dir, "src/Page.vue"), source)
    const result = await invoke(["src", "--format", "gitlab"], dir)
    return { ...result, dir, issues: result.stdout ? JSON.parse(result.stdout) : undefined }
  }

  it("prints repository-relative Code Quality issues with mapped severities", async () => {
    const result = await gitlab(
      '<template>\n  <div class="p-[13px]" />\n  <div style="color:red" />\n</template>',
    )
    expect(result.code).toBe(1)
    expect(result.stderr).toBe("")
    expect(result.stdout.endsWith("]\n")).toBe(true)
    // GitLab requires exactly these fields: severity is one of info, minor, major, critical,
    // or blocker, and location.path is repository-relative without a leading "./".
    expect(result.issues).toEqual([
      {
        description: expect.stringContaining("p-[13px]"),
        check_name: "no-arbitrary-values",
        fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
        severity: "major",
        location: { path: "src/Page.vue", lines: { begin: 2 } },
      },
      {
        description: expect.stringContaining("style"),
        check_name: "no-inline-styles",
        fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
        severity: "minor",
        location: { path: "src/Page.vue", lines: { begin: 3 } },
      },
    ])
  })

  it("keeps fingerprints stable across shifted lines and distinct for duplicate findings", async () => {
    const duplicate = '  <div class="p-[13px]" />\n'
    const before = await gitlab(`<template>\n${duplicate}${duplicate}</template>`)
    const [first, second] = before.issues
    expect(first.description).toBe(second.description)
    expect(first.fingerprint).not.toBe(second.fingerprint)
    // An unrelated finding and blank lines above the duplicates, plus a third duplicate below.
    const after = await gitlab(
      `<template>\n  <div style="color:red" />\n\n\n${duplicate}${duplicate}${duplicate}</template>`,
      before.dir,
    )
    expect(after.issues.map((issue: any) => issue.location.lines.begin)).toEqual([2, 5, 6, 7])
    const fingerprints = after.issues.map((issue: any) => issue.fingerprint)
    expect(fingerprints.slice(1, 3)).toEqual([first.fingerprint, second.fingerprint])
    expect(new Set(fingerprints).size).toBe(4)
  })

  it("keeps a script parse error's fingerprint when lines shift inside the script", async () => {
    const before = await gitlab(
      "<script setup>\nconst = 1\n</script>\n<template><div /></template>",
    )
    const after = await gitlab(
      "<script setup>\nconst ok = 1\nconst = 1\n</script>\n<template><div /></template>",
      before.dir,
    )
    expect(before.issues).toHaveLength(1)
    expect(after.issues).toHaveLength(1)
    expect(after.issues[0].check_name).toBe("parse-error")
    // The description keeps the parser's position; only the fingerprint ignores it.
    expect(before.issues[0].description).toMatch(/\(2:\d+\)$/)
    expect(after.issues[0].description).toMatch(/\(3:\d+\)$/)
    expect(after.issues[0].fingerprint).toBe(before.issues[0].fingerprint)
  })

  it("prints an empty array for a clean check", async () => {
    const result = await gitlab('<template><div class="p-4" /></template>')
    expect(result.code).toBe(0)
    expect(result.stdout).toBe("[]\n")
    expect(result.stderr).toBe("")
  })

  it("matches other formats' exit codes and reports failures on stderr only", async () => {
    const warning = await gitlab('<template><div style="color:red" /></template>')
    expect(warning.code).toBe(0)
    expect(warning.issues).toHaveLength(1)
    const limited = await invoke(["src", "--format", "gitlab", "--max-warnings", "0"], warning.dir)
    expect(limited.code).toBe(1)
    expect(JSON.parse(limited.stdout)).toEqual(warning.issues)
    await writeFile(path.join(warning.dir, "theme.css"), '@import "./missing.css";')
    const theme = await gitlab('<template><div class="p-[13px]" /></template>', warning.dir)
    expect(theme.code).toBe(2)
    expect(theme.stdout).toBe("")
    expect(theme.stderr).toMatch(/^selfix: /)
    await writeFile(path.join(warning.dir, "invalid.ts"), "export default { typo: true }")
    const config = await invoke(
      ["src", "--format", "gitlab", "--config", "invalid.ts"],
      warning.dir,
    )
    expect(config.code).toBe(2)
    expect(config.stdout).toBe("")
    expect(config.stderr).toContain("Unknown config")
  })
})

describe("baseline", () => {
  const colors = (count: number) =>
    `<template>\n${Array.from({ length: count }, () => '  <div class="bg-[#fff]" />').join("\n")}\n</template>`
  async function baselined(files: Record<string, string>, baseline?: unknown) {
    const dir = await project()
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "theme.css", rules: { "no-arbitrary-values": "off" } }',
    )
    for (const [name, source] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(dir, name)), { recursive: true })
      await writeFile(path.join(dir, name), source)
    }
    if (baseline !== undefined)
      await writeFile(path.join(dir, "baseline.json"), JSON.stringify(baseline))
    return dir
  }

  it("suppresses findings up to the recorded count and reports the rest", async () => {
    const dir = await baselined(
      { "src/Page.vue": colors(3) },
      { "src/Page.vue": { "no-raw-colors": { count: 2 } } },
    )
    const result = await invoke(["--baseline", "baseline.json"], dir)
    expect(result.stderr).toBe("")
    expect(result.code).toBe(1)
    const lines = result.stdout.split("\n")
    expect(lines).toHaveLength(4)
    expect(lines[0]).toMatch(/^src[/\\]Page\.vue:4:\d+ error no-raw-colors /)
    expect(lines.slice(1)).toEqual([
      "Checked 1 Vue file: 1 error, 0 warnings.",
      "Baseline: 2 suppressed, 0 unused.",
      "",
    ])
  })

  it("writes a deterministic baseline of errors and warnings that a later check accepts", async () => {
    const dir = await baselined({
      "src/b/Page.vue": colors(2),
      "src/a/Page.vue": '<template><div class="bg-[#fff] flex-cols" /></template>',
    })
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "theme.css", rules: { "no-arbitrary-values": "off", "no-unknown-classes": "warn" } }',
    )
    const first = await invoke(["--update-baseline", "baseline.json"], dir)
    expect(first).toEqual({ code: 0, stdout: "Wrote 4 findings to baseline.json.\n", stderr: "" })
    const written = await readFile(path.join(dir, "baseline.json"), "utf8")
    expect(written).toBe(
      `${JSON.stringify(
        {
          "src/a/Page.vue": { "no-raw-colors": { count: 1 }, "no-unknown-classes": { count: 1 } },
          "src/b/Page.vue": { "no-raw-colors": { count: 2 } },
        },
        null,
        2,
      )}\n`,
    )
    expect((await invoke(["--update-baseline", "baseline.json"], dir)).code).toBe(0)
    expect(await readFile(path.join(dir, "baseline.json"), "utf8")).toBe(written)
    expect(await invoke(["--baseline", "baseline.json", "--max-warnings", "0"], dir)).toEqual({
      code: 0,
      stdout: "Checked 2 Vue files: 0 errors, 0 warnings.\nBaseline: 4 suppressed, 0 unused.\n",
      stderr: "",
    })
  })

  it("counts only unsuppressed warnings toward --max-warnings", async () => {
    const dir = await baselined(
      { "Page.vue": '<template><div class="flex-cols" /><div class="flex-rows" /></template>' },
      { "Page.vue": { "no-unknown-classes": { count: 1 } } },
    )
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "theme.css", rules: { "no-unknown-classes": "warn" } }',
    )
    expect((await invoke(["--baseline", "baseline.json", "--max-warnings", "1"], dir)).code).toBe(0)
    const over = await invoke(["--baseline", "baseline.json", "--max-warnings", "0"], dir)
    expect(over.code).toBe(1)
    expect(over.stdout).toContain("0 errors, 1 warning.")
  })

  it("never records or suppresses parse errors", async () => {
    const dir = await baselined({
      "Broken.vue": "<template><div></template>",
      "Page.vue": colors(1),
    })
    await writeFile(path.join(dir, "baseline.json"), "{}\n")
    const update = await invoke(["--update-baseline", "baseline.json"], dir)
    expect(update.code).toBe(1)
    expect(update.stdout).toMatch(
      /^Broken\.vue:\d+:\d+ error parse-error .*\nBaseline not written: fix parse errors first\.\n$/,
    )
    expect(await readFile(path.join(dir, "baseline.json"), "utf8")).toBe("{}\n")
    const check = await invoke(["--baseline", "baseline.json"], dir)
    expect(check.code).toBe(1)
    expect(check.stdout).toContain("error parse-error")
    await writeFile(
      path.join(dir, "baseline.json"),
      JSON.stringify({ "Broken.vue": { "parse-error": { count: 1 } } }),
    )
    const invalid = await invoke(["--baseline", "baseline.json"], dir)
    expect(invalid.code).toBe(2)
    expect(invalid.stderr).toContain('unknown rule "parse-error" in Broken.vue')
  })

  it("reports unused entries for fixed, renamed, and removed files but not unscanned ones", async () => {
    const dir = await baselined(
      { "src/Fixed.vue": colors(1), "src/Renamed.vue": colors(1), "other/Kept.vue": colors(1) },
      {
        "src/Fixed.vue": { "no-raw-colors": { count: 3 } },
        "src/Old.vue": { "no-raw-colors": { count: 1 } },
        "src/Removed.vue": { "no-raw-colors": { count: 2 } },
        "other/Kept.vue": { "no-raw-colors": { count: 1 } },
      },
    )
    const text = await invoke(["src", "--baseline", "baseline.json"], dir)
    expect(text.code).toBe(1)
    const lines = text.stdout.split("\n")
    expect(lines[0]).toMatch(/^src[/\\]Renamed\.vue:2:\d+ error no-raw-colors /)
    expect(lines.slice(1)).toEqual([
      `${path.join("src", "Fixed.vue")}: unused baseline entry: no-raw-colors allows 3, found 1.`,
      `${path.join("src", "Old.vue")}: unused baseline entry: no-raw-colors allows 1, found 0.`,
      `${path.join("src", "Removed.vue")}: unused baseline entry: no-raw-colors allows 2, found 0.`,
      "Checked 2 Vue files: 1 error, 0 warnings.",
      "Baseline: 1 suppressed, 3 unused.",
      "",
    ])
    const onlyUnused = await invoke(["src/Fixed.vue", "--baseline", "baseline.json"], dir)
    expect(onlyUnused.code).toBe(1)
    expect(onlyUnused.stdout).toContain(
      "0 errors, 0 warnings.\nBaseline: 1 suppressed, 3 unused.\n",
    )
    const json = await invoke(["src", "--baseline", "baseline.json", "--format", "json"], dir)
    expect(json.code).toBe(1)
    const report = JSON.parse(json.stdout)
    expect(report.suppressed).toEqual({ inline: 0, baseline: 1 })
    expect(report.diagnostics).toEqual([
      expect.objectContaining({ file: path.join(dir, "src/Renamed.vue"), rule: "no-raw-colors" }),
    ])
    expect(report.unused).toEqual([
      { file: path.join(dir, "src/Fixed.vue"), rule: "no-raw-colors", count: 3, found: 1 },
      { file: path.join(dir, "src/Old.vue"), rule: "no-raw-colors", count: 1, found: 0 },
      { file: path.join(dir, "src/Removed.vue"), rule: "no-raw-colors", count: 2, found: 0 },
    ])
    const gitlab = await invoke(["src", "--baseline", "baseline.json", "--format", "gitlab"], dir)
    expect(gitlab.code).toBe(1)
    expect(JSON.parse(gitlab.stdout)).toEqual([
      expect.objectContaining({
        check_name: "no-raw-colors",
        location: { path: "src/Renamed.vue", lines: { begin: 2 } },
      }),
    ])
    expect(gitlab.stderr).toContain(
      `selfix: ${path.join("src", "Old.vue")}: unused baseline entry: no-raw-colors allows 1, found 0.\n`,
    )
  })

  it("prunes unused counts without adding new findings, then checks with the result", async () => {
    const dir = await baselined(
      { "src/Fixed.vue": colors(1), "src/New.vue": colors(1), "other/Kept.vue": colors(1) },
      {
        "src/Fixed.vue": { "no-raw-colors": { count: 3 } },
        "src/Removed.vue": { "no-raw-colors": { count: 2 } },
        "other/Kept.vue": { "no-raw-colors": { count: 5 } },
      },
    )
    const result = await invoke(["src", "--prune-baseline", "baseline.json"], dir)
    expect(result.code).toBe(1)
    expect(result.stdout).toMatch(/^src[/\\]New\.vue:2:\d+ error no-raw-colors /)
    expect(result.stdout).toContain("Baseline: 1 suppressed, 0 unused.\n")
    expect(JSON.parse(await readFile(path.join(dir, "baseline.json"), "utf8"))).toEqual({
      "other/Kept.vue": { "no-raw-colors": { count: 5 } },
      "src/Fixed.vue": { "no-raw-colors": { count: 1 } },
    })
  })

  it("reports entries for excluded files inside a scanned directory", async () => {
    const dir = await baselined(
      { "src/Page.vue": colors(1), "src/Skip.vue": colors(1) },
      {
        "src/Page.vue": { "no-raw-colors": { count: 1 } },
        "src/Skip.vue": { "no-raw-colors": { count: 1 } },
      },
    )
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "theme.css", exclude: ["src/Skip.vue"], rules: { "no-arbitrary-values": "off" } }',
    )
    expect((await invoke(["src/Page.vue", "--baseline", "baseline.json"], dir)).code).toBe(0)
    const result = await invoke(["src", "--baseline", "baseline.json"], dir)
    expect(result.code).toBe(1)
    expect(result.stdout).toContain(
      `${path.join("src", "Skip.vue")}: unused baseline entry: no-raw-colors allows 1, found 0.\n`,
    )
    expect((await invoke(["src", "--prune-baseline", "baseline.json"], dir)).code).toBe(0)
    expect(JSON.parse(await readFile(path.join(dir, "baseline.json"), "utf8"))).toEqual({
      "src/Page.vue": { "no-raw-colors": { count: 1 } },
    })
  })

  it("keeps entries for files that fail to parse", async () => {
    const dir = await baselined(
      { "Broken.vue": "<template><div></template>" },
      { "Broken.vue": { "no-raw-colors": { count: 2 } } },
    )
    const check = await invoke(["--baseline", "baseline.json"], dir)
    expect(check.code).toBe(1)
    expect(check.stdout).toContain("error parse-error")
    expect(check.stdout).toContain("Baseline: 0 suppressed, 0 unused.\n")
    expect((await invoke(["--prune-baseline", "baseline.json"], dir)).code).toBe(1)
    expect(JSON.parse(await readFile(path.join(dir, "baseline.json"), "utf8"))).toEqual({
      "Broken.vue": { "no-raw-colors": { count: 2 } },
    })
  })

  it("keys entries by paths relative to the config directory", async () => {
    const dir = await baselined({ "app/src/Page.vue": colors(2) })
    await writeFile(
      path.join(dir, "app/selfix.config.ts"),
      'export default { css: "../theme.css", rules: { "no-arbitrary-values": "off" } }',
    )
    const args = ["app/src", "--config", "app/selfix.config.ts"]
    expect((await invoke([...args, "--update-baseline", "baseline.json"], dir)).code).toBe(0)
    expect(JSON.parse(await readFile(path.join(dir, "baseline.json"), "utf8"))).toEqual({
      "src/Page.vue": { "no-raw-colors": { count: 2 } },
    })
    expect((await invoke([...args, "--baseline", "baseline.json"], dir)).code).toBe(0)
  })

  it("fails on a missing or invalid baseline and rejects conflicting options", async () => {
    const dir = await baselined({ "Page.vue": colors(1) })
    for (const option of ["--baseline", "--prune-baseline"]) {
      const missing = await invoke([option, "baseline.json"], dir)
      expect(missing.code).toBe(2)
      expect(missing.stderr).toContain(`Baseline not found: ${path.join(dir, "baseline.json")}`)
    }
    for (const content of [
      "{",
      "[]",
      '{"Page.vue":{"no-raw-colors":2}}',
      '{"Page.vue":{"no-raw-colors":{"count":0}}}',
      '{"./Page.vue":{"no-raw-colors":{"count":1}}}',
      '{"src\\\\Page.vue":{"no-raw-colors":{"count":1}}}',
      '{"__proto__":{"no-raw-colors":{"count":1}}}',
      '{"/abs/Page.vue":{"no-raw-colors":{"count":1}}}',
    ]) {
      await writeFile(path.join(dir, "baseline.json"), content)
      const invalid = await invoke(["--baseline", "baseline.json"], dir)
      expect(invalid.code).toBe(2)
      expect(invalid.stderr).toContain("Invalid baseline")
    }
    for (const args of [
      ["--baseline", "a.json", "--update-baseline", "b.json"],
      ["--baseline", "a.json", "--prune-baseline", "a.json"],
      ["--update-baseline", "a.json", "--format", "json"],
      ["--update-baseline", "a.json", "--max-warnings", "0"],
      ["--baseline"],
      ["constructor", "Page.vue"],
      ["toString"],
    ]) {
      const rejected = await invoke(args, dir)
      expect(rejected.code).toBe(2)
      expect(rejected.stdout).toBe("")
    }
    expect(await readFile(path.join(dir, "Page.vue"), "utf8")).toBe(colors(1))
  })
})

describe("inline exceptions", () => {
  const comment = "  <!-- selfix-disable-next-line no-raw-colors -- partner brand color -->"
  const brand = '  <div class="bg-[#e30613]" />'
  const excepted = ["<template>", comment, brand, brand, "</template>"].join("\n")
  async function excepting(files: Record<string, string>, config = "") {
    const dir = await project()
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      `export default { css: "theme.css", rules: { "no-arbitrary-values": "off" }${config} }`,
    )
    for (const [name, source] of Object.entries(files))
      await writeFile(path.join(dir, name), source)
    return dir
  }

  it("counts suppressed findings in text and JSON summaries", async () => {
    const dir = await excepting({ "Page.vue": excepted })
    const text = await invoke(["Page.vue"], dir)
    expect(text.code).toBe(1)
    const lines = text.stdout.split("\n")
    expect(lines[0]).toMatch(/^Page\.vue:4:\d+ error no-raw-colors /)
    expect(lines.slice(1)).toEqual([
      "Checked 1 Vue file: 1 error, 0 warnings.",
      "Exceptions: 1 suppressed.",
      "",
    ])
    const json = await invoke(["Page.vue", "--format", "json"], dir)
    expect(json.code).toBe(1)
    expect(JSON.parse(json.stdout)).toEqual({
      diagnostics: [expect.objectContaining({ rule: "no-raw-colors", line: 4 })],
      suppressed: { inline: 1, baseline: 0 },
      unused: [],
    })
  })

  it("returns a clean exit code when every finding is suppressed", async () => {
    const dir = await excepting({
      "Page.vue": ["<template>", comment, brand, "</template>"].join("\n"),
    })
    expect(await invoke(["Page.vue"], dir)).toEqual({
      code: 0,
      stdout: "Checked 1 Vue file: 0 errors, 0 warnings.\nExceptions: 1 suppressed.\n",
      stderr: "",
    })
  })

  it("controls unused-exception severity with config and --unused-exceptions", async () => {
    const unused = excepted.replaceAll("bg-[#e30613]", "p-4")
    const dir = await excepting({ "Page.vue": unused }, ', unusedExceptions: "warn"')
    const warned = await invoke(["Page.vue"], dir)
    expect(warned.code).toBe(0)
    expect(warned.stdout).toMatch(
      /^Page\.vue:2:3 warn unused-exception Unused exception: no-raw-colors reported nothing on the next line\. Remove the comment\.\nChecked 1 Vue file: 0 errors, 1 warning\.\n$/,
    )
    expect((await invoke(["Page.vue", "--max-warnings", "0"], dir)).code).toBe(1)
    const flagged = await invoke(["Page.vue", "--unused-exceptions", "error"], dir)
    expect(flagged.code).toBe(1)
    expect(flagged.stdout).toContain("Page.vue:2:3 error unused-exception ")
    expect(await invoke(["Page.vue", "--unused-exceptions", "off"], dir)).toEqual({
      code: 0,
      stdout: "Checked 1 Vue file: 0 errors, 0 warnings.\n",
      stderr: "",
    })
    const invalid = await invoke(["Page.vue", "--unused-exceptions", "ignore"], dir)
    expect(invalid).toEqual({
      code: 2,
      stdout: "",
      stderr: "selfix: --unused-exceptions must be off, warn, or error.\n",
    })
  })

  it("applies exceptions before the baseline, and never records exception problems", async () => {
    const dir = await excepting({
      "Page.vue": excepted,
      "Bad.vue": excepted.replace(" -- partner brand color", ""),
    })
    const update = await invoke(["--update-baseline", "baseline.json"], dir)
    expect(update.code).toBe(1)
    expect(update.stdout).toMatch(
      /^Bad\.vue:2:3 error invalid-exception Exception comment needs a reason\..*\nBaseline not written: fix parse errors and exception comments first\.\n$/,
    )
    // An unused comment blocks the write as an error, not as a warning.
    await writeFile(path.join(dir, "Bad.vue"), excepted.replaceAll("bg-[#e30613]", "p-4"))
    expect((await invoke(["--update-baseline", "baseline.json"], dir)).code).toBe(1)
    const warned = await invoke(
      ["--update-baseline", "baseline.json", "--unused-exceptions", "warn"],
      dir,
    )
    expect(warned).toEqual({ code: 0, stdout: "Wrote 1 finding to baseline.json.\n", stderr: "" })
    await rm(path.join(dir, "Bad.vue"))
    expect(await invoke(["--update-baseline", "baseline.json"], dir)).toEqual({
      code: 0,
      stdout: "Wrote 1 finding to baseline.json.\n",
      stderr: "",
    })
    expect(JSON.parse(await readFile(path.join(dir, "baseline.json"), "utf8"))).toEqual({
      "Page.vue": { "no-raw-colors": { count: 1 } },
    })
    const json = await invoke(["--baseline", "baseline.json", "--format", "json"], dir)
    expect(json.code).toBe(0)
    expect(JSON.parse(json.stdout)).toEqual({
      diagnostics: [],
      suppressed: { inline: 1, baseline: 1 },
      unused: [],
    })
    const text = await invoke(["--baseline", "baseline.json"], dir)
    expect(text.stdout).toBe(
      "Checked 1 Vue file: 0 errors, 0 warnings.\nExceptions: 1 suppressed.\nBaseline: 1 suppressed, 0 unused.\n",
    )
  })

  it("lists exception problems as GitLab issues", async () => {
    const dir = await excepting({ "Page.vue": excepted.replace("no-raw-colors", "no-raw-color") })
    const gitlab = await invoke(["Page.vue", "--format", "gitlab"], dir)
    expect(gitlab.code).toBe(1)
    expect(
      JSON.parse(gitlab.stdout).map((issue: { check_name: string }) => issue.check_name),
    ).toEqual(["invalid-exception", "no-raw-colors", "no-raw-colors"])
  })
})
