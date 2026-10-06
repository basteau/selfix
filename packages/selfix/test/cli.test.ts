import { mkdtemp, mkdir, readFile, rm, writeFile, symlink, chmod } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { run } from "../src/cli.js"

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
async function project() {
  // Under the workspace so Tailwind's package imports resolve normally.
  const dir = await mkdtemp(path.join(process.cwd(), ".selfix-test-"))
  dirs.push(dir)
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
    expect(JSON.parse(json.stdout)).toEqual([
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
      `export default {css:'theme.css',project:false,components:['^Button$'],exclude:['src/Skip.vue']}`,
    )
    const source = '<template><Button class="p-4" /></template>'
    await writeFile(path.join(dir, "src/Page.vue"), source)
    await writeFile(path.join(dir, "src/Skip.vue"), source)
    await writeFile(path.join(dir, "outside/Other.vue"), source)
    await symlink(path.join(dir, "outside"), path.join(dir, "src/linked"), "dir")
    await symlink(path.join(dir, "outside/Other.vue"), path.join(dir, "src/Link.vue"))
    for (const mode of [[], ["--doctor"]]) {
      const args = mode.length ? mode : ["--format", "json"]
      const single = await invoke([...args, "src"], dir)
      const overlapping = await invoke([...args, "src", "src/Page.vue", "src/*.vue"], dir)
      // The glob explicitly selects Link.vue, unlike recursive enumeration.
      const explicit = await invoke([...args, "src", "src/Link.vue"], dir)
      expect(overlapping).toEqual(explicit)
      expect(single.stderr).toBe("")
      if (!mode.length) {
        expect(
          JSON.parse(single.stdout).map((item: { file: string }) => path.basename(item.file)),
        ).toEqual(["Page.vue"])
        expect(
          JSON.parse(explicit.stdout).map((item: { file: string }) => path.basename(item.file)),
        ).toEqual(["Link.vue", "Page.vue"])
      } else {
        expect(single.stdout).toContain("Page.vue")
        expect(single.stdout).not.toContain("Link.vue")
        expect(explicit.stdout).toContain("Link.vue")
        expect(explicit.stdout).not.toContain("Skip.vue")
      }
      expect(await invoke([...args, "src/linked"], dir)).toEqual(
        await invoke([...args, "src/linked/Other.vue"], dir),
      )
    }
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
    expect(JSON.parse(json.stdout)).toEqual([
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
    expect(JSON.parse(coverage.stdout)).toEqual([
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
    expect(JSON.parse(json.stdout)).toEqual([
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
    const args = ["--config", "../selfix.config.ts", "--css", "../theme.css", "--format", "json"]
    const result = await invoke(args, path.join(dir, "src"))
    expect(result.stderr).toBe("")
    expect(result.code).toBe(1)
    expect(
      JSON.parse(result.stdout).map(
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
  it("discovers component sources from the config directory, with root override and opt-out", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "app"))
    await writeFile(
      path.join(dir, "app/Button.vue"),
      `<script setup lang="ts">defineProps<{size: 'sm' | 'lg'}>()</script><template><button /></template>`,
    )
    await writeFile(
      path.join(dir, "app/Page.vue"),
      `<script setup>import Button from '@/Button.vue'</script>\n<template><Button class="p-4" /></template>`,
    )
    await writeFile(
      path.join(dir, "jsconfig.json"),
      JSON.stringify({ compilerOptions: { paths: { "@/*": ["app/*"] } } }),
    )
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default {css:"theme.css", components:["^Button$"]}',
    )
    const args = ["Page.vue", "--config", "../selfix.config.ts", "--format", "json"]
    const automatic = await invoke(args, path.join(dir, "app"))
    expect(automatic.stderr).toBe("")
    expect(automatic.code).toBe(1)
    expect(JSON.parse(automatic.stdout)[0]).toMatchObject({
      file: path.join(dir, "app/Page.vue"),
      line: 2,
      column: 19,
      definition: { file: path.join(dir, "app/Button.vue"), props: { size: ["sm", "lg"] } },
    })
    await writeFile(
      path.join(dir, "override.config.ts"),
      'export default {css:"theme.css", components:["^Button$"], project:{root:"app", aliases:{"@/*":"./*"}}}',
    )
    expect(
      JSON.parse(
        (
          await invoke(
            ["Page.vue", "--config", "../override.config.ts", "--format", "json"],
            path.join(dir, "app"),
          )
        ).stdout,
      )[0].definition,
    ).toEqual({ file: path.join(dir, "app/Button.vue"), props: { size: ["sm", "lg"] } })
    await writeFile(
      path.join(dir, "disabled.config.ts"),
      'export default {css:"theme.css", components:["^Button$"], project:false}',
    )
    const disabled = await invoke(
      ["Page.vue", "--config", "../disabled.config.ts", "--format", "json"],
      path.join(dir, "app"),
    )
    expect(disabled.code).toBe(1)
    expect(JSON.parse(disabled.stdout)[0]).not.toHaveProperty("definition")
  })
  it("resolves CSS aliases from the config directory even with --css and a different cwd", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "app"))
    await mkdir(path.join(dir, ".nuxt"))
    await writeFile(path.join(dir, ".nuxt/ui.css"), "@theme { --color-brand: #123456; }")
    await writeFile(
      path.join(dir, "app/main.css"),
      '@import "tailwindcss"; @import "#build/ui.css";',
    )
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "app/main.css", cssAliases: { "#build/ui.css": ".nuxt/ui.css" } }',
    )
    await writeFile(path.join(dir, "app/Page.vue"), '<template><div class="bg-brand" /></template>')
    const args = ["--config", "../selfix.config.ts", "--format", "json"]
    expect(await invoke(args, path.join(dir, "app"))).toEqual({
      code: 0,
      stdout: "[]\n",
      stderr: "",
    })
    expect(await invoke([...args, "--css", "main.css"], path.join(dir, "app"))).toEqual({
      code: 0,
      stdout: "[]\n",
      stderr: "",
    })
    await rm(path.join(dir, ".nuxt/ui.css"))
    const missing = await invoke(args, path.join(dir, "app"))
    expect(missing.code).toBe(2)
    expect(missing.stderr).toContain("#build/ui.css")
    expect(missing.stderr).toContain(path.join(dir, ".nuxt/ui.css"))
    expect(missing.stderr).toContain("nuxt prepare")
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
    const diagnostics = JSON.parse(result.stdout)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      rule: "no-unknown-classes",
      file: path.join(dir, "Page.vue"),
    })
  })
  it("skips excluded and generated directories", async () => {
    const dir = await project()
    for (const name of ["dist", "node_modules", "generated"]) {
      await mkdir(path.join(dir, name))
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
  it("requires a TypeScript config instead of silently using defaults or other formats", async () => {
    const dir = await project()
    await rm(path.join(dir, "selfix.config.ts"))
    await writeFile(path.join(dir, "selfix.config.json"), '{"css":"theme.css"}')
    const missing = await invoke(["--css", "theme.css"], dir)
    expect(missing.code).toBe(2)
    expect(missing.stderr).toContain("Create selfix.config.ts")
    for (const extension of ["json", "js", "mjs"]) {
      const result = await invoke(["--config", `selfix.config.${extension}`], dir)
      expect(result.code).toBe(2)
      expect(result.stderr).toContain("Configuration must be a .ts file")
    }
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
    `export default {css:'../theme.css',exclude:['**/Page.vue']}`,
  )
  for (const file of ["Page.vue", "app/Page.vue"])
    await writeFile(path.join(dir, file), '<template><div style="color:red" /></template>')
  const result = await invoke(
    ["--config", "app/selfix.config.ts", "Page.vue", "app/Page.vue", "--format", "json"],
    dir,
  )
  expect(result.code).toBe(1)
  expect(JSON.parse(result.stdout)).toEqual([
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

describe("doctor", () => {
  it("uses the singular for one component usage", async () => {
    const dir = await project()
    await writeFile(
      path.join(dir, "Page.vue"),
      `<script setup>import Button from '@/components/ui/button'</script><template><Button /></template>`,
    )
    const result = await invoke(["--doctor", "Page.vue"], dir)
    expect(result.stdout).toContain("Scanned 1 Vue file; 1 component usage; 1 actively protected.")
  })

  it("reports classless usages with original locations and shared recognition", async () => {
    const dir = await project()
    await writeFile(
      path.join(dir, "Page.vue"),
      `<script setup>
import { Button as Action } from '@/components/ui/button'
import Other from '@/components/ui-extra'
</script>
<template>
  <action />
  <Other class="p-4" />
  <div />
</template>`,
    )
    const result = await invoke(["--doctor", "Page.vue"], dir)
    expect(result.code).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain(`Configuration: ${path.join(dir, "selfix.config.ts")}`)
    expect(result.stdout).toContain(`Tailwind CSS loaded: ${path.join(dir, "theme.css")}`)
    expect(result.stdout).toContain(
      'Page.vue:6:3 <Action>: recognized by ui "@/components/ui"; no-restyle: error; active protection: yes; definition: unavailable',
    )
    expect(result.stdout).toContain(
      "Page.vue:7:3 <Other>: unrecognized (no recognition setting matches)",
    )
    expect(result.stdout).toContain('componentImports: ["^@/components/ui-extra$"]')
    expect(result.stdout).toContain("Scanned 1 Vue file; 2 component usages; 1 actively protected.")
    expect(result.stdout).not.toContain("<div>")
  })
})

it("doctor rejects dynamic enforcement inputs without evaluating application expressions", async () => {
  const dir = await project()
  await writeFile(
    path.join(dir, "Page.vue"),
    `<script setup>
import Button from '@/components/ui/button'
const classes = (() => { throw new Error('must not execute') })()
</script><template><Button :class="classes" /></template>`,
  )
  const result = await invoke(["--doctor"], dir)
  expect(result.code).toBe(1)
  expect(result.stdout).toContain("Cannot statically inspect class input")
  expect(result.stderr).toBe("")
  expect(result.stdout).not.toContain("must not execute")
})

it("doctor reports opaque v-bind spreads but not $attrs forwarding", async () => {
  const dir = await project()
  await writeFile(
    path.join(dir, "Page.vue"),
    `<script setup>import { Button } from '@/components/ui/button'</script>
<template>
  <div v-bind="$attrs" />
  <Button v-bind="attrs" />
  <div v-bind="{ ...rest, class: 'p-4' }" />
</template>`,
  )
  await writeFile(path.join(dir, "Forward.vue"), '<template><div v-bind="$attrs" /></template>')
  const result = await invoke(["--doctor", "Page.vue", "Forward.vue"], dir)
  expect(result.code).toBe(1)
  expect(result.stderr).toBe("")
  // Opaque spreads keep the same analysis lines as before require-static-classes owned them.
  expect(result.stdout.split("\n").filter((line) => line.includes("unsupported analysis"))).toEqual(
    [
      "Page.vue:4:11 error unsupported analysis: Dynamic v-bind attrs may contain class or style",
      "Page.vue:4:11 error unsupported analysis: Cannot statically inspect class input on <Button>; enforcement coverage is incomplete.",
      "Page.vue:5:8 error unsupported analysis: Dynamic v-bind attrs may contain class or style",
      "Page.vue:5:8 error unsupported analysis: Cannot statically inspect class input on <div>; enforcement coverage is incomplete.",
    ],
  )
  const forward = await invoke(["--doctor", "Forward.vue"], dir)
  expect(forward.code).toBe(0)
  expect(forward.stdout).not.toContain("unsupported analysis")
})

it("doctor shares import precedence and identity with ordinary lint", async () => {
  const dir = await project()
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default {
    css:'theme.css', ui:['@/ui'], components:['^Global$', '^Ignored$'],
    componentImports:['^library$'], ignoreImports:['^ignored$'], project:false
  }`,
  )
  await writeFile(
    path.join(dir, "Page.vue"),
    `<script setup lang="ts">
import { Button as Action } from '@/ui/button'
import Exact from '@/ui'
import Near from '@/ui-extra'
import FromLibrary from 'library'
import Ignored from 'ignored'
import Div from '@/ui/div'
import type TypeOnly from '@/ui/type'
import { type TypeNamed } from '@/ui/type'
</script><template>
<action class="p-4" /><Exact class="p-4" /><Near class="p-4" />
<FromLibrary class="p-4" /><Ignored class="p-4" /><Global class="p-4" />
<div class="p-4" /><TypeOnly class="p-4" /><TypeNamed class="p-4" />
</template>`,
  )
  const doctor = await invoke(["--doctor"], dir)
  expect(doctor.code).toBe(0)
  expect(doctor.stdout).toContain('<Action>: recognized by ui "@/ui"')
  expect(doctor.stdout).toContain('<Exact>: recognized by ui "@/ui"')
  expect(doctor.stdout).toContain("<Near>: unrecognized")
  expect(doctor.stdout).toContain('<FromLibrary>: recognized by componentImports "^library$"')
  expect(doctor.stdout).toContain('<Ignored>: ignored by ignoreImports "^ignored$"')
  expect(doctor.stdout).toContain('<Global>: recognized by components "^Global$"')
  expect(doctor.stdout).toContain("<TypeOnly>: unrecognized")
  expect(doctor.stdout).toContain("<TypeNamed>: unrecognized")
  expect(doctor.stdout).not.toContain("<Div>")
  expect(doctor.stdout).not.toContain('componentImports: ["^ignored$"]')
  expect(doctor.stdout).toContain("8 component usages; 4 actively protected.")
  expect(doctor.stdout).toContain("definition: disabled")
  const lint = await invoke(["--format", "json"], dir)
  expect(
    JSON.parse(lint.stdout)
      .filter((d: { rule: string }) => d.rule === "no-restyle")
      .map((d: { component: string }) => d.component),
  ).toEqual(["Action", "Exact", "FromLibrary", "Global"])
  expect((await invoke(["--doctor"], dir)).stdout).toBe(doctor.stdout)
})

it("doctor uses config-relative exclusions, overrides, and separate verified discovery", async () => {
  const dir = await project()
  await mkdir(path.join(dir, "src"))
  await writeFile(path.join(dir, "Button.vue"), "<template><button /></template>")
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default {
    css:'missing.css', ui:['./Button.vue'], exclude:['src/Bad.vue'],
    components:['^Button$'], rules:{'no-restyle':'off'},
    overrides:[{files:['src/Warn.vue'],rules:{'no-restyle':'warn'}}]
  }`,
  )
  const source = `<script setup>import Button from '../Button.vue'</script><template><Button class="p-4" /></template>`
  await writeFile(path.join(dir, "src/Off.vue"), source)
  await writeFile(path.join(dir, "src/Warn.vue"), source)
  await writeFile(path.join(dir, "src/Bad.vue"), "<template><broken></template>")
  const args = ["--config", "../selfix.config.ts", "--css", "../theme.css", "*.vue"]
  const result = await invoke([...args, "--doctor"], path.join(dir, "src"))
  expect(result.code).toBe(0)
  expect(result.stdout).toContain("Scanned 2 Vue files; 2 component usages; 1 actively protected.")
  expect(result.stdout).toContain(
    `no-restyle: off; active protection: no; definition: ${path.join(dir, "Button.vue")}`,
  )
  expect(result.stdout).toContain(
    `no-restyle: warn; active protection: yes; definition: ${path.join(dir, "Button.vue")}`,
  )
  const lint = await invoke([...args, "--format", "json"], path.join(dir, "src"))
  expect(JSON.parse(lint.stdout)).toEqual([
    expect.objectContaining({
      rule: "no-restyle",
      severity: "warn",
      file: path.join(dir, "src/Warn.vue"),
    }),
  ])
  const off = await invoke(
    ["--config", "../selfix.config.ts", "--css", "../theme.css", "Off.vue", "--doctor"],
    path.join(dir, "src"),
  )
  expect(off.code).toBe(0)
  expect(off.stdout).toContain("no-restyle is disabled for recognized usages")
})

it.each([
  ["<template><div /></template>", "no component usages collected"],
  ["<template><Unknown /></template>", "usages are unrecognized or ignored"],
])("doctor explains zero protection for %s", async (source, reason) => {
  const dir = await project()
  await writeFile(path.join(dir, "Page.vue"), source)
  const result = await invoke(["--doctor"], dir)
  expect(result.code).toBe(0)
  expect(result.stdout).toContain(`Advisory: zero actively protected matches: ${reason}`)
})

it.each([
  ["--format", "json"],
  ["--format", "gitlab"],
  ["--max-warnings", "0"],
])("doctor rejects %s %s", async (...options) => {
  const dir = await project()
  const result = await invoke(["--doctor", ...options], dir)
  expect(result.code).toBe(2)
  expect(result.stdout).toBe("")
  expect(result.stderr).toContain("Remove --format json or gitlab and --max-warnings")
})

it.each([
  "<template><div></template>",
  '<script src="./external.ts"></script><template><Button /></template>',
  '<template src="./external.html"></template>',
  '<template lang="pug">Button</template>',
  '<template><component :is="(() => { throw new Error() })()" /></template>',
  `<script setup>import * as UI from 'library'</script><template><UI.Button.Icon /></template>`,
])("doctor exposes unsupported or invalid input: %s", async (source) => {
  const dir = await project()
  await writeFile(path.join(dir, "Page.vue"), source)
  const result = await invoke(["--doctor"], dir)
  expect(result.code).toBe(1)
  expect(result.stdout).toContain("error unsupported analysis:")
  expect(result.stdout).toContain("0 actively protected.")
})

it.each(["theme", "metadata", "empty", "config", "input"])(
  "doctor fails on %s loading",
  async (failure) => {
    const dir = await project()
    if (failure !== "empty")
      await writeFile(path.join(dir, "Page.vue"), "<template><Button /></template>")
    if (failure === "theme")
      await writeFile(path.join(dir, "theme.css"), '@import "missing-theme-package";')
    if (failure === "metadata") await writeFile(path.join(dir, "tsconfig.json"), "{broken")
    if (failure === "config")
      await writeFile(path.join(dir, "selfix.config.ts"), "export default {css:42}")
    const result = await invoke(["--doctor", ...(failure === "input" ? ["missing.vue"] : [])], dir)
    expect(result.code).toBe(2)
    expect(result.stderr).toContain("selfix:")
    expect(result.stdout).not.toContain("Tailwind CSS loaded:")
  },
)

it("doctor resolves prepared auto-imported globals without conflating discovery and protection", async () => {
  const dir = await project()
  await mkdir(path.join(dir, ".nuxt"))
  await writeFile(path.join(dir, "Button.vue"), "<template><button /></template>")
  await writeFile(
    path.join(dir, ".nuxt/components.d.ts"),
    `export const UButton: typeof import('../Button.vue')['default']`,
  )
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default {css:'theme.css', components:['^u-button$']}`,
  )
  await writeFile(path.join(dir, "Page.vue"), "<template><u-button /><UButton /></template>")
  const result = await invoke(["--doctor", "Page.vue"], dir)
  expect(result.code).toBe(0)
  expect(result.stdout).toContain(
    `<u-button>: recognized by components "^u-button$"; no-restyle: error; active protection: yes; definition: ${path.join(dir, "Button.vue")}`,
  )
  expect(result.stdout).toContain(
    `<UButton>: unrecognized (no recognition setting matches); no-restyle: error; active protection: no; definition: ${path.join(dir, "Button.vue")}`,
  )
})

it("discovers non-Nuxt auto-import declarations from componentDeclarations", async () => {
  const dir = await project()
  const button = path.join(dir, "src/Button.vue")
  await mkdir(path.join(dir, "src"))
  await writeFile(
    button,
    `<script setup lang="ts">defineProps<{size?: 'sm' | 'lg'}>()</script><template><button /></template>`,
  )
  await writeFile(
    path.join(dir, "components.d.ts"),
    `export {}
declare module 'vue' {
  export interface GlobalComponents {
    UButton: typeof import('./src/Button.vue')['default']
  }
}`,
  )
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default {css:'theme.css', components:['^UButton$'], project:{componentDeclarations:'components.d.ts'}}`,
  )
  await writeFile(path.join(dir, "Page.vue"), '<template><UButton class="p-4" /></template>')
  const lint = await invoke(["--format", "json", "Page.vue"], dir)
  expect(lint.code).toBe(1)
  expect(JSON.parse(lint.stdout)).toMatchObject([
    {
      rule: "no-restyle",
      component: "UButton",
      definition: { file: button, props: { size: ["sm", "lg"] } },
    },
  ])
  const doctor = await invoke(["--doctor", "Page.vue"], dir)
  expect(doctor.code).toBe(0)
  expect(doctor.stdout).toContain(`active protection: yes; definition: ${button}`)
  const old = await project()
  await writeFile(
    path.join(old, "selfix.config.ts"),
    `export default {css:'theme.css', project:{nuxtComponents:'components.d.ts'}}`,
  )
  await writeFile(path.join(old, "Page.vue"), "<template><div /></template>")
  const removed = await invoke(["Page.vue"], old)
  expect(removed.code).toBe(2)
  expect(removed.stderr).toContain("Use project.componentDeclarations")
})

it("doctor suggests escaped exact imports only once and never suggests for ignored imports", async () => {
  const dir = await project()
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default {css:'theme.css',ignoreImports:['^ignored$']}`,
  )
  await writeFile(
    path.join(dir, "Page.vue"),
    `<script setup>
import Widget from '@acme/widget.v2'
import Ignored from 'ignored'
</script><template><Widget /><Widget /><Ignored /></template>`,
  )
  const result = await invoke(["--doctor"], dir)
  expect(result.code).toBe(0)
  const suggestions = result.stdout.split("\n").filter((line) => line.startsWith("If you intend"))
  expect(suggestions).toHaveLength(1)
  expect(suggestions[0]).toContain('componentImports: ["^@acme/widget\\\\.v2$"]')
})

it("doctor recognizes a static imported :is binding", async () => {
  const dir = await project()
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    `export default {css:'theme.css',components:['^Button$','^UI\\\\.Button$'],project:false}`,
  )
  await writeFile(
    path.join(dir, "Page.vue"),
    `<script setup>
import Button from './Button.vue'
import * as UI from '@/components/ui/button'
</script><template><component :is="Button" class="p-4" /><UI.Button class="p-4" /></template>`,
  )
  const result = await invoke(["--doctor"], dir)
  expect(result.code).toBe(0)
  expect(result.stdout).toContain(
    '<Button>: recognized by components "^Button$"; no-restyle: error; active protection: yes',
  )
  expect(result.stdout).toContain(
    '<UI.Button>: recognized by components "^UI\\\\.Button$"; no-restyle: error; active protection: yes',
  )
  expect(result.stdout).not.toContain("component coverage is incomplete")
})

it.each(['<Component :is="value" />', '<div is="vue:Button" />'])(
  "doctor rejects alternate Vue component syntax %s",
  async (tag) => {
    const dir = await project()
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      `export default {css:'theme.css',components:['^Component$', '^div$']}`,
    )
    await writeFile(path.join(dir, "Page.vue"), `<template>${tag}</template>`)
    const result = await invoke(["--doctor"], dir)
    expect(result.code).toBe(1)
    expect(result.stdout).toContain("0 actively protected.")
    expect(result.stdout).toContain("component coverage is incomplete")
  },
)

describe("components.json defaults", () => {
  const page = `<script setup>import { Button } from "@/lib/ui/button"</script><template><Button class="p-4" /></template>`

  it("fills css and ui that the config leaves out", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "selfix.config.ts"), "export default {}")
    await writeFile(
      path.join(dir, "components.json"),
      JSON.stringify({ tailwind: { css: "theme.css" }, aliases: { ui: "@/lib/ui" } }),
    )
    await writeFile(path.join(dir, "Page.vue"), page)
    const lint = await invoke(["Page.vue", "--format", "json"], dir)
    expect(lint.code).toBe(1)
    expect(JSON.parse(lint.stdout).map((finding: { rule: string }) => finding.rule)).toEqual([
      "no-restyle",
    ])
    const doctor = await invoke(["Page.vue", "--doctor"], dir)
    expect(doctor.code).toBe(0)
    expect(doctor.stdout).toContain(`Tailwind CSS loaded: ${path.join(dir, "theme.css")}`)
    expect(doctor.stdout).toContain("From components.json: css, ui\n")
  })

  it("keeps explicit config values", async () => {
    const dir = await project()
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "theme.css", ui: ["@/components/ui"] }',
    )
    await writeFile(
      path.join(dir, "components.json"),
      JSON.stringify({ tailwind: { css: "missing.css" }, aliases: { ui: "@/lib/ui" } }),
    )
    await writeFile(path.join(dir, "Page.vue"), page)
    const result = await invoke(["Page.vue", "--doctor"], dir)
    expect(result.code).toBe(0)
    expect(result.stdout).not.toContain("From components.json")
    expect(result.stdout).toContain("unrecognized")
  })

  it("ignores components.json when the config and --css set everything", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "selfix.config.ts"), 'export default { ui: ["@/lib/ui"] }')
    await writeFile(path.join(dir, "components.json"), "{ nope")
    await writeFile(path.join(dir, "Page.vue"), page)
    const result = await invoke(["Page.vue", "--css", "theme.css", "--format", "json"], dir)
    expect(result.code).toBe(1)
    expect(result.stderr).toBe("")
  })

  it("lets --css win and keeps an explicit empty ui", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "selfix.config.ts"), "export default { ui: [] }")
    await writeFile(
      path.join(dir, "components.json"),
      JSON.stringify({ tailwind: { css: "missing.css" }, aliases: { ui: "@/lib/ui/" } }),
    )
    await writeFile(path.join(dir, "Page.vue"), page)
    const result = await invoke(["Page.vue", "--css", "theme.css", "--doctor"], dir)
    expect(result.code).toBe(0)
    expect(result.stdout).not.toContain("From components.json")
    expect(result.stdout).toContain("unrecognized")
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
    expect(JSON.parse(json.stdout)).toEqual([
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
    expect(JSON.parse(off.stdout)).toEqual([])
  })
  it("strips a trailing slash from aliases.ui", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "selfix.config.ts"), 'export default { css: "theme.css" }')
    await writeFile(
      path.join(dir, "components.json"),
      JSON.stringify({ aliases: { ui: "@/lib/ui/" } }),
    )
    await writeFile(path.join(dir, "Page.vue"), page)
    const result = await invoke(["Page.vue", "--doctor"], dir)
    expect(result.stdout).toContain('recognized by ui "@/lib/ui"')
    expect(result.stdout).toContain("From components.json: ui\n")
  })

  it("reads components.json only from the config directory", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "sub"))
    await writeFile(path.join(dir, "sub/selfix.config.ts"), "export default {}")
    await writeFile(
      path.join(dir, "components.json"),
      JSON.stringify({ tailwind: { css: "theme.css" } }),
    )
    await writeFile(path.join(dir, "Page.vue"), page)
    const result = await invoke(["Page.vue", "--config", "sub/selfix.config.ts"], dir)
    expect(result.code).toBe(2)
    expect(result.stderr).toContain("set tailwind.css in components.json")
  })

  it("fails on an invalid file or a missing css entry", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "selfix.config.ts"), "export default {}")
    await writeFile(path.join(dir, "Page.vue"), page)
    const missing = await invoke(["Page.vue"], dir)
    expect(missing.code).toBe(2)
    expect(missing.stderr).toContain("set tailwind.css in components.json")
    await writeFile(path.join(dir, "components.json"), "{ nope")
    const invalid = await invoke(["Page.vue"], dir)
    expect(invalid.code).toBe(2)
    expect(invalid.stderr).toContain("Invalid components.json")
    await writeFile(path.join(dir, "components.json"), JSON.stringify({ aliases: { ui: 1 } }))
    const wrongType = await invoke(["Page.vue"], dir)
    expect(wrongType.code).toBe(2)
    expect(wrongType.stderr).toContain("aliases.ui must be a non-empty string")
    await writeFile(path.join(dir, "components.json"), JSON.stringify({ aliases: "x" }))
    expect((await invoke(["Page.vue"], dir)).stderr).toContain("aliases must be an object")
    await writeFile(path.join(dir, "components.json"), "[]")
    expect((await invoke(["Page.vue"], dir)).stderr).toContain("the root must be an object")
    await writeFile(
      path.join(dir, "components.json"),
      JSON.stringify({ tailwind: { css: "nope.css" } }),
    )
    const absent = await invoke(["Page.vue"], dir)
    expect(absent.code).toBe(2)
    expect(absent.stderr).toContain(
      `components.json tailwind.css not found: ${path.join(dir, "nope.css")}`,
    )
  })
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
