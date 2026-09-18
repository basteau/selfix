import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, expect, test } from "vitest"
import { baseCandidate, createTailwind } from "../src/tailwind.js"
import { createLinter } from "../src/index.js"

async function tempProject(name: string): Promise<string> {
  const base = join(tmpdir(), `selfix-${name}-${process.pid}-${Date.now()}`)
  await mkdir(base, { recursive: true })
  return base
}

describe("baseCandidate", () => {
  test.each([
    ["hover:focus:!-mt-4", "!-mt-4"],
    ["[&:not(:hover)]:-mt-4!", "-mt-4!"],
    ["hover:bg-(color:--color-primary)", "bg-(color:--color-primary)"],
    ["hover:[color:var(--color-primary)]", "[color:var(--color-primary)]"],
    ["supports-(--custom:func(a:b)):p-4", "p-4"],
    ["[&[data-x='(']]:bg-[red]", "bg-[red]"],
    ['[&[data-x="]):"]]:!-mt-4', "!-mt-4"],
    ["[&[data-x='[:']]:-mt-4!", "-mt-4!"],
    [String.raw`[&[data-x='\'(']]:bg-[red]`, "bg-[red]"],
    [String.raw`[&[data-x='\\']]:bg-[red]`, "bg-[red]"],
    [String.raw`[&.foo\(]:bg-[red]`, "bg-[red]"],
    [String.raw`[&.foo\)]:bg-[red]`, "bg-[red]"],
    [String.raw`[&.foo\[]:bg-[red]`, "bg-[red]"],
    [String.raw`[&.foo\]]:bg-[red]`, "bg-[red]"],
    [String.raw`hover:foo\:bar`, String.raw`foo\:bar`],
    [String.raw`hover:foo\':bar`, "bar"],
  ])("strips only top-level variants from %s", (token, expected) => {
    expect(baseCandidate(token)).toBe(expected)
  })
})

describe("createTailwind", () => {
  test.each([
    String.raw`.hover\:card`,
    String.raw`.\63 ard`,
    ".card:has(.child)",
    ".card .child",
    ".card > .child",
    ".card + .other",
    ".card ~ .other",
    ".card:nth-child(2 of .other)",
    ".card:not(:not(.other))",
    "&:hover",
  ])("rejects unsupported selector attribution for %s", async (selector) => {
    await expect(createTailwind(`${selector} { color: red; }`, process.cwd())).rejects.toThrow(
      /Unable to inspect CSS: unsupported selector/,
    )
  })

  test.each([
    ".parent:has(.child) { .inner { color: red; } }",
    ".parent { .child { color: red; } }",
    ".parent { @media (width > 10px) { .child { color: red; } } }",
  ])("rejects unsupported selector ancestry in %s", async (css) => {
    await expect(createTailwind(css, process.cwd())).rejects.toThrow(
      /Unable to inspect CSS: unsupported selector/,
    )
  })

  test("retains positive subjects without attributing negated classes", async () => {
    const tailwind = await createTailwind(
      `.card:not(.ghost, :is(.missing, .absent)) { color: red; }
       :is(.first, .second:hover), :where(.third):focus { padding: 1rem; }
       .ghost { margin: 1rem; }`,
      process.cwd(),
    )
    expect(tailwind.inspect("card")).toEqual({ known: true, categories: ["color"], rawColor: true })
    expect(tailwind.inspect("ghost")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
    for (const token of ["missing", "absent"]) {
      expect(tailwind.inspect(token)).toEqual({
        known: false,
        categories: ["unknown"],
        rawColor: false,
      })
    }
    for (const token of ["first", "second", "third"]) {
      expect(tailwind.inspect(token)).toEqual({
        known: true,
        categories: ["spacing"],
        rawColor: false,
      })
    }
  })

  test("keeps class-free selector-list branches separate from class compounds", async () => {
    const tailwind = await createTailwind(
      `body main, button.card.active[data-state="open"]:hover, input + label,
       ._label::before, .--notice { color: red; }`,
      process.cwd(),
    )
    for (const token of ["card", "active", "_label", "--notice"]) {
      expect(tailwind.inspect(token)).toEqual({
        known: true,
        categories: ["color"],
        rawColor: true,
      })
    }
  })

  test("ignores class-like text in selector attributes", async () => {
    const tailwind = await createTailwind(
      String.raw`[data-url="a.fake"] { color: red; }
      .card[data-label='a.other, .third']:hover { padding: 1rem; }`,
      process.cwd(),
    )
    for (const token of ["fake", "other", "third"]) {
      expect(tailwind.inspect(token)).toEqual({
        known: false,
        categories: ["unknown"],
        rawColor: false,
      })
    }
    expect(tailwind.inspect("card")).toEqual({
      known: true,
      categories: ["spacing"],
      rawColor: false,
    })
  })

  test.each([{ style: "./theme.css" }, { default: "./index.cjs", style: "./theme.css" }])(
    "loads a package stylesheet export %j",
    async (exports) => {
      const base = await mkdtemp(join(tmpdir(), "selfix-css-exports-"))
      try {
        const pkg = join(base, "node_modules", "fixture-theme")
        await mkdir(pkg, { recursive: true })
        await writeFile(join(pkg, "package.json"), JSON.stringify({ exports }))
        await writeFile(join(pkg, "theme.css"), ".package-theme { padding: 1rem; }")
        await writeFile(join(pkg, "index.cjs"), 'throw new Error("JavaScript is not CSS")')
        const tailwind = await createTailwind('@import "fixture-theme";', base)
        expect(tailwind.inspect("package-theme")).toEqual({
          known: true,
          categories: ["spacing"],
          rawColor: false,
        })
      } finally {
        await rm(base, { recursive: true, force: true })
      }
    },
  )

  test("resolves dependencies from a symlinked package's real directory", async () => {
    const base = await mkdtemp(join(tmpdir(), "selfix-css-linked-"))
    try {
      const modules = join(base, "node_modules")
      const store = join(modules, ".store", "node_modules")
      const pkg = join(store, "fixture-theme")
      const dependency = join(store, "fixture-dependency")
      await mkdir(pkg, { recursive: true })
      await mkdir(dependency, { recursive: true })
      await symlink(pkg, join(modules, "fixture-theme"), "dir")
      await writeFile(
        join(pkg, "package.json"),
        JSON.stringify({ exports: { style: "./theme.css" } }),
      )
      await writeFile(join(pkg, "theme.css"), '@import "fixture-dependency";')
      await writeFile(join(dependency, "package.json"), JSON.stringify({ exports: "./theme.css" }))
      await writeFile(join(dependency, "theme.css"), ".dependency { padding: 1rem; }")
      const tailwind = await createTailwind('@import "fixture-theme";', base)
      expect(tailwind.inspect("dependency")).toEqual({
        known: true,
        categories: ["spacing"],
        rawColor: false,
      })
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  test.each([
    { exports: { "./theme": { style: { default: "./css/theme.css" } } } },
    { exports: { "./theme": "./css/theme.css" } },
    { exports: { "./theme": { default: "./css/theme.css" } } },
  ])("loads scoped subpaths and nested imports %j", async (manifest) => {
    const base = await mkdtemp(join(tmpdir(), "selfix-css-subpath-"))
    try {
      const pkg = join(base, "node_modules", "@fixture", "theme")
      await mkdir(join(pkg, "css"), { recursive: true })
      await mkdir(join(base, "src"), { recursive: true })
      await writeFile(join(pkg, "package.json"), JSON.stringify(manifest))
      await writeFile(join(pkg, "css/theme.css"), '@import "./nested.css";')
      await writeFile(join(pkg, "css/nested.css"), ".nested-theme { margin: 1rem; }")
      const tailwind = await createTailwind('@import "@fixture/theme/theme";', join(base, "src"))
      expect(tailwind.inspect("nested-theme")).toEqual({
        known: true,
        categories: ["layout"],
        rawColor: false,
      })
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  test.each([
    { exports: "./theme.css" },
    { exports: { ".": { style: "./theme.css" } } },
    { style: "./theme.css", main: "./index.cjs" },
    { main: "./theme.css" },
    {},
  ])("loads supported root stylesheet targets %j", async (manifest) => {
    const base = await mkdtemp(join(tmpdir(), "selfix-css-root-"))
    try {
      const pkg = join(base, "node_modules", "fixture-theme")
      await mkdir(pkg, { recursive: true })
      await writeFile(join(pkg, "package.json"), JSON.stringify(manifest))
      for (const name of ["theme.css", "index.css"]) {
        await writeFile(join(pkg, name), ".root-theme { padding: 1rem; }")
      }
      const tailwind = await createTailwind('@import "fixture-theme";', base)
      expect(tailwind.inspect("root-theme").known).toBe(true)
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  test.each([
    { exports: { style: "./missing.css", default: "./theme.css" } },
    { exports: { style: ["./theme.css"] } },
    { exports: { style: null, default: "./theme.css" } },
    { exports: { import: "./theme.css" } },
    { exports: { "./*": "./theme.css" } },
    { exports: { style: "../outside.css" } },
    { exports: { default: "./index.cjs" } },
    { exports: null, style: "./theme.css" },
  ])("rejects missing or unsupported exports with origin context %j", async (manifest) => {
    const base = await mkdtemp(join(tmpdir(), "selfix-css-invalid-"))
    try {
      const pkg = join(base, "node_modules", "fixture-theme")
      await mkdir(pkg, { recursive: true })
      await writeFile(join(pkg, "package.json"), JSON.stringify(manifest))
      await writeFile(join(pkg, "theme.css"), ".should-not-load { padding: 1rem; }")
      // Valid-looking CSS in a JS file must never become part of the theme.
      await writeFile(join(pkg, "index.cjs"), ".should-not-load { padding: 1rem; }")
      await expect(createTailwind('@import "fixture-theme";', base)).rejects.toThrow(
        `Unable to resolve import "fixture-theme" from "${base}"`,
      )
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  test("keeps CSS conditions separate from plugin and config module resolution", async () => {
    const base = await mkdtemp(join(tmpdir(), "selfix-css-modules-"))
    try {
      for (const [name, code] of [
        [
          "fixture-plugin",
          'module.exports = ({ addUtilities }) => addUtilities({ ".plugin-space": { padding: "3rem" } })',
        ],
        [
          "fixture-config",
          'module.exports = { theme: { extend: { colors: { configured: "#abcdef" } } } }',
        ],
      ]) {
        const pkg = join(base, "node_modules", name!)
        await mkdir(pkg, { recursive: true })
        await writeFile(
          join(pkg, "package.json"),
          JSON.stringify({
            exports: { style: "./missing.css", require: "./index.cjs" },
          }),
        )
        await writeFile(join(pkg, "index.cjs"), code!)
      }
      const tailwind = await createTailwind(
        '@import "tailwindcss"; @plugin "fixture-plugin"; @config "fixture-config";',
        base,
      )
      expect(tailwind.inspect("plugin-space")).toEqual({
        known: true,
        categories: ["spacing"],
        rawColor: false,
      })
      expect(tailwind.inspect("text-configured")).toEqual({
        known: true,
        categories: ["color"],
        rawColor: false,
      })
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  test("shares color value semantics across custom CSS composites and nested fallbacks", async () => {
    const css = `@import "tailwindcss";
      .fallback { color: var(--brand, var(--other, red)); }
      .palette { color: var(--brand, var(--color-red-500, var(--other))); }
      .background { background: center / cover linear-gradient(red, blue); }
      .shadow { box-shadow: 0 0 4px red; }
      .border { border-inline-start: 1px solid red; }
      .outline { outline: 1px solid #abc; }
      .filter { filter: drop-shadow(0 0 4px rgb(1 2 3)); }
      .decoration { text-decoration: underline red; }
      .transparent { text-shadow: 0 0 4px transparent; }
      .semantic { background: linear-gradient(var(--red), var(--blue)); }
      .nested { color: var(--brand, var(--other)); }
      .mix { color: color-mix(in srgb, var(--brand), currentColor); }
      .light { color: light-dark(var(--brand), var(--other)); }
      .url { background: url(/red/blue.svg#abc); }
      .urlquoted { background: url("icon)red.svg"); }
      .quoted { background: image("red", "#abc", "var(--color-red-500)"); }
      .identifiers { color: var(--brand_red, var(--red-blue)); }
      .unrelated { font-family: red; content: "red"; }
    `
    const raw = [
      "fallback",
      "palette",
      "background",
      "shadow",
      "border",
      "outline",
      "filter",
      "decoration",
      "transparent",
    ]
    const semantic = [
      "semantic",
      "nested",
      "mix",
      "light",
      "url",
      "urlquoted",
      "quoted",
      "identifiers",
      "unrelated",
    ]
    const tailwind = await createTailwind(css, process.cwd())
    for (const token of [...raw, ...semantic]) {
      expect(tailwind.inspect(token), token).toMatchObject({
        known: true,
        rawColor: raw.includes(token),
      })
    }
  })

  test.each(["", "tw:"])(
    "detects composite raw colors independently with prefix %s",
    async (prefix) => {
      const css = `@import "tailwindcss"; @theme inline ${prefix ? "prefix(tw)" : ""} { --color-brand: red; }`
      const raw = [
        "bg-[var(--color-red-500,red)]",
        "[background:red]",
        "hover:bg-[linear-gradient(red,blue)]!",
        "focus:!shadow-[0_0_4px_red]",
        "drop-shadow-[0_0_4px_red]",
        "[text-decoration:underline_red]",
        "[color:var(--color-red-500,var(--brand))]",
        "[color:var(--brand,var(--other,red))]",
        `[color:var(--${prefix ? "tw-" : ""}color-red-500,var(--other))]`,
      ].map((token) => prefix + token)
      const semantic = [
        "bg-brand",
        "bg-transparent",
        "bg-[currentColor]",
        "bg-[var(--red)]",
        "bg-[var(--brand_red)]",
        "bg-[color-mix(in_srgb,var(--brand),var(--other))]",
        "[color:var(--brand,var(--other))]",
        "bg-[linear-gradient(var(--brand),var(--other))]",
      ].map((token) => prefix + token)
      const tailwind = await createTailwind(css, process.cwd())
      for (const token of [...raw, ...semantic]) {
        expect(tailwind.inspect(token), token).toMatchObject({
          known: true,
          rawColor: raw.includes(token),
        })
      }
      const linter = await createLinter({
        css,
        config: {
          rules: {
            "no-raw-colors": "error",
            "no-restyle": "off",
            "no-arbitrary-values": "off",
            "no-inline-styles": "off",
            "no-unknown-classes": "off",
            "require-static-classes": "off",
          },
        },
      })
      expect(
        linter
          .lint(`<template><div class="${[...raw, ...semantic].join(" ")}" /></template>`)
          .map(({ rule, className }) => ({ rule, className })),
      ).toEqual(raw.map((className) => ({ rule: "no-raw-colors", className })))
    },
  )

  test("does not treat quoted content as color declarations", async () => {
    const css = '.label { content: "literal;color:red;"; } .actual { color: red; }'
    const tailwind = await createTailwind(css, process.cwd())
    expect(tailwind.inspect("label")).toEqual({
      known: true,
      categories: ["unknown"],
      rawColor: false,
    })
    const linter = await createLinter({ css })
    expect(
      linter
        .lint('<template><div class="label actual" /></template>')
        .filter((item) => item.rule === "no-raw-colors")
        .map((item) => item.className),
    ).toEqual(["actual"])
  })
  test("preserves escaped quotes and comment-like strings without inventing rules", async () => {
    const tailwind = await createTailwind(
      String.raw`
      .label { content: "escaped \"; } .fake { color:red; } /*"; margin: 1rem; }
      .actual { content: "/*"; color: red; --text: "*/"; }
      /* .commented { color: red; } */
      @property --registered {
        syntax: "<color>";
        inherits: false;
        initial-value: red;
      }
    `,
      process.cwd(),
    )
    expect(tailwind.inspect("label")).toEqual({
      known: true,
      categories: ["layout", "unknown"],
      rawColor: false,
    })
    expect(tailwind.inspect("actual")).toEqual({
      known: true,
      categories: ["color", "unknown"],
      rawColor: true,
    })
    for (const token of ["fake", "commented"]) {
      expect(tailwind.inspect(token)).toEqual({
        known: false,
        categories: ["unknown"],
        rawColor: false,
      })
    }
  })

  test("preserves nested values and ignores property registrations in generated CSS", async () => {
    const tailwind = await createTailwind(
      `
      @import "tailwindcss";
      .nested { --color: var(--fallback, fn(a;b), #123456); }
      @utility registered {
        margin: 1rem;
        @property --color {
          syntax: "<color>";
          inherits: false;
          initial-value: red;
        }
      }
      @media (width > 10px) { .responsive, .other:hover { padding: 1rem } }
    `,
      process.cwd(),
    )
    expect(tailwind.inspect("nested")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
    expect(tailwind.inspect("registered")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
    for (const token of ["responsive", "other"]) {
      expect(tailwind.inspect(token)).toEqual({
        known: true,
        categories: ["spacing"],
        rawColor: false,
      })
    }
  })

  test.each([
    '.broken { content: "unterminated; }',
    ".broken { color: red; /* unterminated",
    ".broken { color: var(--brand; }",
    ".broken { color: red;",
    ".broken { color: red; invalid; }",
    ".broken { --value: { color: red; }; }",
  ])("rejects malformed or unsupported CSS instead of silently inspecting it: %s", async (css) => {
    await expect(createTailwind(css, process.cwd())).rejects.toThrow()
  })

  test.each([
    ["leading-6", "typography"],
    ["ease-in", "motion"],
    ["rotate-45", "effects"],
    ["-rotate-45", "effects"],
    ["rotate-x-45", "effects"],
    ["hover:rotate-z-45", "effects"],
    ["[--custom:1]", "unknown"],
    ["[--tw-unrecognized:1]", "unknown"],
  ])("classifies %s from its generated declarations", async (token, category) => {
    const tailwind = await createTailwind('@import "tailwindcss";', process.cwd())
    expect(tailwind.inspect(token)).toEqual({
      known: true,
      categories: [category],
      rawColor: false,
    })
  })

  test.each(["group", "peer", "dark"])(
    "inspects custom declarations on marker %s",
    async (marker) => {
      const tailwind = await createTailwind(
        `@import "tailwindcss"; .${marker} { padding: 1rem; color: red; }`,
        process.cwd(),
      )
      const expected = { known: true, categories: ["layout", "color", "spacing"], rawColor: true }
      expect(tailwind.inspect(marker)).toEqual(expected)
      expect(tailwind.inspect(marker)).toEqual(expected)
    },
  )

  test("inspects imported marker CSS while preserving semantic color provenance", async () => {
    const base = await mkdtemp(join(tmpdir(), "selfix-marker-"))
    try {
      await writeFile(
        join(base, "custom.css"),
        `
        .group { padding: 1rem; color: red; }
        .peer { color: var(--color-brand); }
        .dark { color: var(--color-red-500); }
      `,
      )
      const tailwind = await createTailwind(
        '@import "tailwindcss"; @import "./custom.css"; @theme inline { --color-brand: rebeccapurple; }',
        base,
      )
      for (let repeat = 0; repeat < 2; repeat++) {
        expect(tailwind.inspect("group")).toEqual({
          known: true,
          categories: ["layout", "color", "spacing"],
          rawColor: true,
        })
        expect(tailwind.inspect("peer")).toEqual({
          known: true,
          categories: ["layout", "color"],
          rawColor: false,
        })
        expect(tailwind.inspect("dark")).toEqual({
          known: true,
          categories: ["layout", "color"],
          rawColor: true,
        })
        expect(tailwind.inspect("text-brand")).toEqual({
          known: true,
          categories: ["color"],
          rawColor: false,
        })
      }
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  test("keeps named and prefixed markers distinct from plain custom classes", async () => {
    const tailwind = await createTailwind(
      '@import "tailwindcss" prefix(tw); .group, .peer, .dark { padding: 1rem; color: red; }',
      process.cwd(),
    )
    for (const marker of ["group", "peer", "dark"]) {
      expect(tailwind.inspect(marker)).toEqual({
        known: true,
        categories: ["layout", "color", "spacing"],
        rawColor: true,
      })
      for (const token of [`${marker}/menu`, `tw:${marker}`, `tw:${marker}/menu`]) {
        expect(tailwind.inspect(token)).toEqual({
          known: true,
          categories: ["layout"],
          rawColor: false,
        })
      }
      expect(tailwind.inspect(`other:${marker}`).known).toBe(false)
    }
  })

  test("combines generated and custom declarations for the same class", async () => {
    const tailwind = await createTailwind(
      '@import "tailwindcss"; .mt-4 { color: red; }',
      process.cwd(),
    )
    const expected = { known: true, categories: ["layout", "color"], rawColor: true }
    expect(tailwind.inspect("mt-4")).toEqual(expected)
    expect(tailwind.inspect("mt-4")).toEqual(expected)
  })

  test("preserves literal provenance when semantic utilities overlap custom CSS", async () => {
    const tailwind = await createTailwind(
      `@import "tailwindcss";
       @theme inline { --color-brand: rebeccapurple; }
       .text-brand { margin-top: 1rem; }
       .bg-brand { color: red; }`,
      process.cwd(),
    )
    expect(tailwind.inspect("text-brand")).toEqual({
      known: true,
      categories: ["layout", "color"],
      rawColor: false,
    })
    expect(tailwind.inspect("bg-brand")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
  })

  test("includes overlapping declarations from imported stylesheets", async () => {
    const base = await mkdtemp(join(tmpdir(), "selfix-overlap-"))
    try {
      await writeFile(join(base, "custom.css"), ".mt-4 { color: red; }")
      const tailwind = await createTailwind('@import "tailwindcss"; @import "./custom.css";', base)
      expect(tailwind.inspect("mt-4")).toEqual({
        known: true,
        categories: ["layout", "color"],
        rawColor: true,
      })
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  test.each(["", "tw:"])("recognizes named literals with prefix %s", async (prefix) => {
    const css = `
      @import "tailwindcss";
      @theme inline ${prefix ? "prefix(tw)" : ""} {
        --color-brand: rebeccapurple;
        --color-surface: papayawhip;
      }
      .named { color: ReBeccAPurple !important; }
      .paper { background-color: papayawhip; }
      .variable { color: var(--rebeccapurple); }
      .current { color: currentColor !important; }
      .clear { color: transparent; }
    `
    const raw = [
      "bg-[rebeccapurple]",
      "hover:text-[papayawhip]!",
      "focus:!bg-[ReBeccAPurple]",
      "bg-[color:papayawhip]",
      "[border-color:rebeccapurple]!",
      "[color:papayawhip]",
      "bg-[transparent]",
      "bg-[#123456]!",
      "text-[rgb(1_2_3)]!",
    ].map((token) => prefix + token)
    raw.push("named", "paper", "clear")
    const semantic = [
      "bg-brand!",
      "hover:text-surface",
      "bg-[var(--rebeccapurple)]",
      "[color:var(--papayawhip)]!",
      "bg-[currentColor]!",
      "[color:currentColor]",
      "bg-transparent",
    ].map((token) => prefix + token)
    semantic.push("variable", "current")
    const tailwind = await createTailwind(css, process.cwd())
    for (const token of [...raw, ...semantic]) {
      expect(tailwind.inspect(token), token).toEqual({
        known: true,
        categories: ["color"],
        rawColor: raw.includes(token),
      })
    }
    const linter = await createLinter({ css })
    const diagnostics = linter.lint(
      `<template><div class="${[...raw, ...semantic].join(" ")}" /></template>`,
    )
    expect(
      diagnostics.filter((item) => item.rule === "no-raw-colors").map((item) => item.className),
    ).toEqual(raw)
  })

  test("detects raw colors after quoted and escaped variant delimiters", async () => {
    const tailwind = await createTailwind('@import "tailwindcss";', process.cwd())
    for (const variant of [
      "[&[data-x='(']]",
      '[&[data-x=")"]]',
      "[&[data-x='[']]",
      '[&[data-x="]"]]',
      String.raw`[&[data-x='\'(']]`,
      String.raw`[&[data-x='\\']]`,
      String.raw`[&.foo\(]`,
      String.raw`[&.foo\)]`,
      String.raw`[&.foo\[]`,
      String.raw`[&.foo\]]`,
    ]) {
      expect(tailwind.inspect(`${variant}:bg-[red]`)).toEqual({
        known: true,
        categories: ["color"],
        rawColor: true,
      })
      expect(tailwind.inspect(`${variant}:p-4`)).toEqual({
        known: true,
        categories: ["spacing"],
        rawColor: false,
      })
    }
  })
  test("inspects parenthesized values and important negative variants", async () => {
    const tailwind = await createTailwind(
      '@import "tailwindcss"; @theme { --color-primary: #124578; }',
      process.cwd(),
    )
    for (const token of ["[&:not(:hover)]:!-mt-4", "hover:-mt-4!"]) {
      expect(tailwind.inspect(token)).toEqual({
        known: true,
        categories: ["layout"],
        rawColor: false,
      })
    }
    expect(tailwind.inspect("hover:bg-(color:--color-primary)")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: false,
    })
  })
  test("inspects Tailwind utilities and variants through the compiler", async () => {
    const base = await tempProject("utilities")
    const tailwind = await createTailwind('@import "tailwindcss";', base)

    expect(tailwind.colors).not.toContain("red-500")
    expect(tailwind.inspect("p-4")).toEqual({
      known: true,
      categories: ["spacing"],
      rawColor: false,
    })
    expect(tailwind.inspect("mt-4")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
    expect(tailwind.inspect("text-lg")).toEqual({
      known: true,
      categories: ["typography"],
      rawColor: false,
    })
    expect(tailwind.inspect("hover:bg-blue-500")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
    expect(tailwind.inspect("not-a-real-utility")).toEqual({
      known: false,
      categories: ["unknown"],
      rawColor: false,
    })
  })

  test("marks group peer and dark marker classes as layout", async () => {
    const base = await tempProject("markers")
    const tailwind = await createTailwind('@import "tailwindcss";', base)

    expect(tailwind.inspect("group")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
    expect(tailwind.inspect("peer/menu")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
    expect(tailwind.inspect("dark")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
  })

  test("uses the configured Tailwind prefix for marker classes", async () => {
    const base = await tempProject("prefixed-markers")
    const tailwind = await createTailwind(
      `
				@import "tailwindcss";
				@theme prefix(tw) {
					--color-brand: #123456;
				}
			`,
      base,
    )

    expect(tailwind.inspect("tw:group/menu")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
    expect(tailwind.inspect("foo:group")).toEqual({
      known: false,
      categories: ["unknown"],
      rawColor: false,
    })
    expect(tailwind.inspect("tw:mt-4")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
  })

  test("supports custom theme colors, utilities, and plain CSS classes", async () => {
    const base = await tempProject("custom")
    const tailwind = await createTailwind(
      `
				@import "tailwindcss";
				@theme {
					--color-brand: #123456;
				}
				@utility tab-4 {
					tab-size: 4;
				}
				.card-title {
					color: var(--color-brand);
					margin-block: 1rem;
				}
				.card-no-semi {
					color: red
				}
				/* .fake { color: red } */
			`,
      base,
    )

    expect(tailwind.colors).toContain("brand")
    expect(tailwind.inspect("text-brand")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: false,
    })
    expect(tailwind.inspect("tab-4")).toEqual({
      known: true,
      categories: ["unknown"],
      rawColor: false,
    })
    expect(tailwind.inspect("card-title")).toEqual({
      known: true,
      categories: ["layout", "color"],
      rawColor: false,
    })
    expect(tailwind.inspect("hover:card-title")).toEqual({
      known: false,
      categories: ["unknown"],
      rawColor: false,
    })
    expect(tailwind.inspect("card-no-semi")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
    expect(tailwind.inspect("fake")).toEqual({
      known: false,
      categories: ["unknown"],
      rawColor: false,
    })
  })

  test("keeps unknown categories when a known class has unclassified declarations", async () => {
    const base = await tempProject("mixed")
    const tailwind = await createTailwind(
      `
				@import "tailwindcss";
				.fancy {
					color: var(--color-brand);
					tab-size: 4;
				}
			`,
      base,
    )

    expect(tailwind.inspect("fancy")).toEqual({
      known: true,
      categories: ["color", "unknown"],
      rawColor: false,
    })
  })

  test("resolves nested relative stylesheet imports", async () => {
    const base = await tempProject("imports")
    const styles = join(base, "styles")
    await mkdir(styles, { recursive: true })
    await writeFile(
      join(styles, "theme.css"),
      `
				@import "../tokens.css";
				@utility content-auto {
					content-visibility: auto;
				}
			`,
    )
    await writeFile(
      join(base, "tokens.css"),
      `
				@theme {
					--color-accent: oklch(70% 0.12 230);
				}
			`,
    )

    const tailwind = await createTailwind(
      `
				@import "tailwindcss";
				@import "./styles/theme.css";
			`,
      base,
    )

    expect(tailwind.colors).toContain("accent")
    expect(tailwind.inspect("text-accent")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: false,
    })
    expect(tailwind.inspect("content-auto")).toEqual({
      known: true,
      categories: ["unknown"],
      rawColor: false,
    })
  })

  test("loads JavaScript config modules without evaluating application code", async () => {
    const base = await tempProject("config")
    await writeFile(
      join(base, "tailwind.config.mjs"),
      `
				export default {
					theme: {
						extend: {
							colors: {
								configured: "#abcdef",
							},
						},
					},
				};
			`,
    )

    const tailwind = await createTailwind(
      `
				@import "tailwindcss";
				@config "./tailwind.config.mjs";
			`,
      base,
    )

    expect(tailwind.inspect("text-configured")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: false,
    })
  })

  test("detects arbitrary raw colors and stock palette usage", async () => {
    const base = await tempProject("raw-colors")
    const tailwind = await createTailwind('@import "tailwindcss";', base)

    expect(tailwind.inspect("bg-[#123456]")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
    expect(tailwind.inspect("text-red-500")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
    expect(tailwind.inspect("bg-black")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
    expect(tailwind.inspect("bg-[red]")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
    expect(tailwind.inspect("[color:red]")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
    expect(tailwind.inspect("[&_#abc]:p-4")).toEqual({
      known: true,
      categories: ["spacing"],
      rawColor: false,
    })
  })

  test("detects stock colors with configured Tailwind prefixes", async () => {
    const base = await tempProject("prefixed-raw-colors")
    const tailwind = await createTailwind(
      `
				@import "tailwindcss";
				@theme prefix(tw) {}
			`,
      base,
    )

    expect(tailwind.inspect("tw:bg-red-500")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
    expect(tailwind.inspect("tw:bg-[#123456]")).toEqual({
      known: true,
      categories: ["color"],
      rawColor: true,
    })
  })

  test("classifies common Tailwind utilities that emit internal variables", async () => {
    const base = await tempProject("internal-vars")
    const tailwind = await createTailwind('@import "tailwindcss";', base)

    expect(tailwind.inspect("space-x-4")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
    expect(tailwind.inspect("font-bold")).toEqual({
      known: true,
      categories: ["typography"],
      rawColor: false,
    })
    expect(tailwind.inspect("rounded-t-lg")).toEqual({
      known: true,
      categories: ["shape"],
      rawColor: false,
    })
    expect(tailwind.inspect("duration-150")).toEqual({
      known: true,
      categories: ["motion"],
      rawColor: false,
    })
    expect(tailwind.inspect("ring-2")).toEqual({
      known: true,
      categories: ["effects"],
      rawColor: false,
    })
    expect(tailwind.inspect("translate-x-1")).toEqual({
      known: true,
      categories: ["effects"],
      rawColor: false,
    })
    expect(tailwind.inspect("cursor-pointer")).toEqual({
      known: true,
      categories: ["layout"],
      rawColor: false,
    })
  })

  test("fails clearly when an imported stylesheet cannot be resolved", async () => {
    const base = await tempProject("missing")

    await expect(createTailwind('@import "./missing.css";', base)).rejects.toThrow(
      'Unable to resolve import "./missing.css"',
    )
  })
})
