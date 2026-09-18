import { describe, expect, it, vi } from "vitest"
import { createLinter, defineConfig, ruleNames, type Config, type RuleName } from "../src/index.js"

const css = '@import "tailwindcss"; @theme { --color-primary: #124578; }'
function only(name: RuleName, options = {}) {
  return Object.fromEntries(
    ruleNames.map((rule) => [rule, rule === name ? ["error", options] : "off"]),
  ) as Config["rules"]
}
const button = (attrs: string) =>
  `<script setup>import { Button } from '@/components/ui/button'</script>\n<template><Button ${attrs} /></template>`

describe("design-system rules", () => {
  it.each([
    ["mt-4", ["layout"]],
    ["bg-primary", ["color"]],
    ["tracking-wide", ["typography"]],
    ["hover:tracking-wide!", ["typography"]],
    ["p-4", ["spacing"]],
    ["border-solid", ["shape"]],
    ["hover:border-solid", ["shape"]],
    ["scale-105", ["effects"]],
    ["-scale-x-105", ["effects"]],
    ["duration-200", ["motion"]],
    ["truncate", ["layout", "typography"]],
    ["md:truncate", ["layout", "typography"]],
  ] as const)(
    "enforces complete category permissions and deny precedence for %s",
    async (token, allowed) => {
      const source = button(`class="${token}"`)
      const accepted = await createLinter({
        css,
        config: { rules: only("no-restyle", { allow: allowed }) },
      })
      expect(accepted.lint(source)).toEqual([])
      for (const category of allowed) {
        const restricted = await createLinter({
          css,
          config: {
            rules: only("no-restyle", {
              allow: allowed.filter((value) => value !== category),
              message: "blocked {{category}}",
            }),
          },
        })
        expect(restricted.lint(source)).toEqual([
          expect.objectContaining({
            rule: "no-restyle",
            className: token,
            message: `blocked ${category}`,
          }),
        ])
        const denied = await createLinter({
          css,
          config: { rules: only("no-restyle", { allow: allowed, deny: [category] }) },
        })
        expect(denied.lint(source)).toEqual([
          expect.objectContaining({
            rule: "no-restyle",
            className: token,
            message: expect.stringContaining("denied"),
          }),
        ])
      }
    },
  )

  it("does not let recognized categories hide unknown bookkeeping or CSS declarations", async () => {
    const linter = await createLinter({
      css: `${css} .custom { --tw-scale-future: 2; tab-size: 4; scale: 2; }`,
      config: {
        rules: only("no-restyle", { allow: ["effects"], message: "blocked {{category}}" }),
      },
    })
    expect(linter.lint(button('class="custom"'))).toEqual([
      expect.objectContaining({
        rule: "no-restyle",
        className: "custom",
        message: "blocked unknown",
      }),
    ])
  })

  it("applies recognition, contracts, and class props only to resolved component identities", async () => {
    const source = `<script setup lang="ts">
import { Button, Button as BaseButton, UIButton, Base_Button, type SpecifierType } from '@/components/ui/button';
import type DefaultType from '@/components/ui/types';
import type { WholeType } from '@/components/ui/types';
</script>
<template>
<Button class="flex" content-class="flex" />
<button class="flex" content-class="flex" />
<Button v-pre class="flex" content-class="flex" />
<div v-pre><Button class="flex" content-class="flex" /></div>
<base-button class="flex" />
<u-i-button class="flex" />
<ui-button class="flex" />
<basebutton class="flex" />
<base_button class="flex" />
<DefaultType class="flex" />
<whole-type class="flex" />
<SpecifierType class="flex" />
<GlobalButton class="flex" />
</template>`
    const linter = await createLinter({
      css,
      config: {
        components: ["^GlobalButton$"],
        classProps: [{ pattern: "^Button$", props: { contentClass: "class" } }],
        rules: only("no-restyle", {
          contracts: [{ pattern: "^(Button|BaseButton|UIButton|GlobalButton)$", deny: ["flex"] }],
        }),
      },
    })
    const diagnostics = linter.lint(source, "identity.vue")
    expect(
      diagnostics.map(({ rule, component, className, prop, line, column, offset }) => ({
        rule,
        component,
        className,
        prop,
        line,
        column,
        offset,
      })),
    ).toEqual([
      {
        rule: "no-restyle",
        component: "Button",
        className: "flex",
        prop: undefined,
        line: 7,
        column: 9,
        offset: source.indexOf('class="flex"'),
      },
      {
        rule: "no-restyle",
        component: "Button",
        className: "flex",
        prop: "content-class",
        line: 7,
        column: 22,
        offset: source.indexOf('content-class="flex"'),
      },
      {
        rule: "no-restyle",
        component: "BaseButton",
        className: "flex",
        prop: undefined,
        line: 11,
        column: 14,
        offset: source.indexOf('class="flex"', source.indexOf("<base-button")),
      },
      {
        rule: "no-restyle",
        component: "UIButton",
        className: "flex",
        prop: undefined,
        line: 12,
        column: 13,
        offset: source.indexOf('class="flex"', source.indexOf("<u-i-button")),
      },
      {
        rule: "no-restyle",
        component: "GlobalButton",
        className: "flex",
        prop: undefined,
        line: 19,
        column: 15,
        offset: source.indexOf('class="flex"', source.indexOf("<GlobalButton")),
      },
    ])
  })
  it("prepares policy regexes before linting and reuses them across files", async () => {
    const patterns: string[] = []
    vi.stubGlobal(
      "RegExp",
      new Proxy(RegExp, {
        construct(target, args) {
          patterns.push(String(args[0]))
          return Reflect.construct(target, args)
        },
      }),
    )
    try {
      const linter = await createLinter({
        css,
        config: {
          ui: [],
          components: ["^GlobalButton$"],
          componentImports: ["^@policy/ui$"],
          ignoreImports: ["^@policy/ignored$"],
          rules: only("no-restyle", {
            allow: ["layout"],
            deny: ["px-*"],
            message: "blocked {{className}}",
            contracts: [
              { pattern: "^(Button|GlobalButton)$", allow: ["p-*"] },
              { pattern: ".*", allow: ["*"] },
            ],
          }),
        },
      })
      const prepared = patterns.length
      const source = `<script setup>
import Button from '@policy/ui'
import Ignored from '@policy/ignored'
</script><template><Button class="p-4 px-2 mt-4" /><GlobalButton class="px-2" /><Ignored class="px-2" /></template>`
      for (const file of ["First.vue", "Second.vue"]) {
        expect(linter.lint(source, file)).toEqual([
          expect.objectContaining({
            file,
            rule: "no-restyle",
            severity: "error",
            component: "Button",
            className: "px-2",
            message: "blocked px-2",
          }),
          expect.objectContaining({
            file,
            component: "Button",
            className: "mt-4",
            message: "blocked mt-4",
          }),
          expect.objectContaining({
            file,
            component: "GlobalButton",
            className: "px-2",
            message: "blocked px-2",
          }),
        ])
      }
      // Observe only policy regexes; Vue and Tailwind may construct their own.
      const policyPatterns = [
        "^GlobalButton$",
        "^@policy/ui$",
        "^@policy/ignored$",
        "^(Button|GlobalButton)$",
        ".*",
        "^p-.*$",
        "^px-.*$",
        "^layout$",
        "^.*$",
      ]
      expect(
        patterns.slice(prepared).filter((pattern) => policyPatterns.includes(pattern)),
      ).toEqual([])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it.each([false, true])(
    "reports external scripts with independent findings (rules disabled: %s)",
    async (disabled) => {
      const linter = await createLinter({
        css,
        config: {
          rules: disabled
            ? Object.fromEntries(ruleNames.map((name) => [name, "off"]))
            : only("no-arbitrary-values"),
        },
      })
      const source = `<!-- leading comment -->
<script src="./missing-application.ts"></script>
<template><Button class="p-4" /><div class="p-[13px]" /></template>`
      expect(linter.lint(source, "External.vue")).toEqual([
        expect.objectContaining({
          file: "External.vue",
          rule: "parse-error",
          severity: "error",
          message: "External script src is not supported; move the script inline in this SFC",
          line: 2,
          column: 1,
          offset: source.indexOf("<script"),
        }),
        ...(disabled
          ? []
          : [
              expect.objectContaining({
                rule: "no-arbitrary-values",
                className: "p-[13px]",
                line: 3,
                column: 38,
                offset: source.indexOf('class="p-[13px]"'),
              }),
            ]),
      ])
    },
  )

  it.each([
    `<script>import Button from '@/components/ui/button'; export default { components: { Button } }</script>`,
    `<script setup>import Button from '@/components/ui/button'</script>`,
  ])("preserves inline component recognition: %s", async (script) => {
    const linter = await createLinter({ css })
    expect(linter.lint(`${script}<template><Button class="p-4" /></template>`)).toEqual([
      expect.objectContaining({ rule: "no-restyle", component: "Button", className: "p-4" }),
    ])
  })

  it("keeps uncertainty errors when ordinary rules are disabled", async () => {
    const linter = await createLinter({
      css,
      config: { rules: Object.fromEntries(ruleNames.map((name) => [name, "off"])) },
    })
    const diagnostics = linter.lint(
      '<template><div v-bind="{ ...a, ...b }" /><div class="p-[13px]" /></template>',
    )
    expect(diagnostics).toEqual([
      expect.objectContaining({
        rule: "parse-error",
        severity: "error",
        message: "Dynamic v-bind attrs may contain class or style",
      }),
    ])
    expect(linter.lint("<template><div></template>")).toEqual([
      expect.objectContaining({ rule: "parse-error", severity: "error" }),
    ])
  })

  it.each([
    '<template><div class="p-[13px]" style="color: red"></template>',
    '<script setup>const broken =</script><template><div class="p-[13px]" /></template><style>.x { color: red }</style>',
  ])("suppresses ordinary findings after fatal parsing: %s", async (source) => {
    const linter = await createLinter({ css })
    const diagnostics = linter.lint(source)
    expect(diagnostics.length).toBeGreaterThan(0)
    expect(
      diagnostics.every(({ rule, severity }) => rule === "parse-error" && severity === "error"),
    ).toBe(true)
    expect(diagnostics.map(({ offset }) => offset)).toEqual(
      diagnostics.map(({ offset }) => offset).sort((a, b) => a - b),
    )
  })

  it("preserves independent diagnostics and consolidates binding uncertainty", async () => {
    const linter = await createLinter({ css, config: { rules: only("no-arbitrary-values") } })
    const source = `<template>
  <div v-bind="{ ...a, ...b, [key]: value }" />
  <div class="p-[13px]" />
  <div :[key]="value" />
</template>`
    expect(linter.lint(source, "Mixed.vue")).toEqual([
      expect.objectContaining({
        rule: "parse-error",
        line: 2,
        column: 8,
        offset: source.indexOf("v-bind"),
      }),
      expect.objectContaining({
        rule: "no-arbitrary-values",
        className: "p-[13px]",
        line: 3,
        column: 8,
        offset: source.indexOf("class="),
      }),
      expect.objectContaining({
        rule: "parse-error",
        line: 4,
        column: 8,
        offset: source.indexOf(":[key]"),
      }),
    ])
  })

  it.each(["error", "off"] as const)(
    "preserves independent findings with class shorthand (require-static-classes: %s)",
    async (severity) => {
      const linter = await createLinter({
        css,
        config: { rules: { ...only("no-unknown-classes"), "require-static-classes": severity } },
      })
      const source = `<template>
  <div :class />
  <div class="not-a-utility" />
</template>`
      const expected = [
        expect.objectContaining({
          rule: "no-unknown-classes",
          className: "not-a-utility",
          line: 3,
          column: 8,
        }),
      ]
      if (severity === "error") {
        expected.unshift(
          expect.objectContaining({ rule: "require-static-classes", line: 2, column: 8 }),
        )
      }
      expect(linter.lint(source, "Shorthand.vue")).toEqual(expected)
    },
  )

  it.each([
    ["leading-6", "typography"],
    ["ease-in", "motion"],
    ["rotate-45", "effects"],
  ])("allows %s through its category permission", async (token, category) => {
    const linter = await createLinter({
      css,
      config: { rules: only("no-restyle", { allow: [category] }) },
    })
    expect(linter.lint(button(`class="${token}"`))).toEqual([])
  })

  it.each([
    { allow: ["typography"], expected: "unknown" },
    { allow: [], expected: "typography" },
    { allow: ["*"], deny: ["unknown"], expected: "unknown" },
    { allow: [], deny: ["unknown", "typography"], expected: "typography" },
  ])("reports the blocked category for a mixed utility: %j", async ({ expected, ...options }) => {
    const linter = await createLinter({
      css: `${css} .mixed { tab-size: 4; line-height: 1.5; }`,
      config: {
        rules: only("no-restyle", {
          ...options,
          message: { typography: "blocked {{category}}", unknown: "unclassified {{category}}" },
        }),
      },
    })
    expect(linter.lint(button('class="mixed"'))).toEqual([
      expect.objectContaining({
        className: "mixed",
        message: expected === "unknown" ? "unclassified unknown" : "blocked typography",
      }),
    ])
  })

  it("names the disallowed category in the default rejection message", async () => {
    const linter = await createLinter({
      css: `${css} .mixed { line-height: 1.5; --tw-unrecognized: 1; }`,
      config: { rules: only("no-restyle", { allow: ["typography"] }) },
    })
    expect(linter.lint(button('class="mixed"'))).toEqual([
      expect.objectContaining({
        className: "mixed",
        message: expect.stringContaining("owns its unknown"),
      }),
    ])
  })

  it("keeps token deny precedence over category permissions", async () => {
    const linter = await createLinter({
      css,
      config: { rules: only("no-restyle", { allow: ["typography"], deny: ["leading-*"] }) },
    })
    expect(linter.lint(button('class="leading-6"'))).toEqual([
      expect.objectContaining({
        className: "leading-6",
        message: expect.stringContaining("denied"),
      }),
    ])
  })

  it.each(["no-restyle", "no-raw-colors"] as const)(
    "%s independently inspects applied declarations at the original SFC class",
    async (rule) => {
      const linter = await createLinter({
        css: `${css} .card { margin: 1rem; color: red; @apply p-4 bg-red-500; }`,
        config: { rules: only(rule) },
      })
      expect(linter.lint(button('class="card"'), "Applied.vue")).toEqual([
        expect.objectContaining({
          rule,
          className: "card",
          file: "Applied.vue",
          line: 2,
          column: 19,
        }),
      ])
    },
  )

  it("reports both rules once for direct and applied effects", async () => {
    const linter = await createLinter({
      css: `${css} .card { margin: 1rem; @apply p-4 bg-red-500; }`,
    })
    expect(
      linter
        .lint(button('class="card"'))
        .map(({ rule }) => rule)
        .sort(),
    ).toEqual(["no-raw-colors", "no-restyle"])
  })

  it("accepts applied semantic colors and rejects applied literals", async () => {
    const linter = await createLinter({
      css: `${css} @theme inline { --color-brand: #123456; }
        .semantic { @apply bg-brand; } .literal { @apply bg-[#123456]; }`,
      config: { rules: only("no-raw-colors") },
    })
    expect(linter.lint(button('class="semantic"'))).toEqual([])
    expect(linter.lint(button('class="literal"'))).toEqual([
      expect.objectContaining({ rule: "no-raw-colors", className: "literal" }),
    ])
  })

  it.each([
    ["@utility raw { color: red; }", "raw"],
    ["@theme inline { --color-red-500: #ff0000; }", "bg-red-500"],
  ])("reports raw provenance for ordinary and applied %s", async (theme, utility) => {
    const linter = await createLinter({
      css: `${css} ${theme} .card { @apply ${utility}; }`,
      config: { rules: only("no-raw-colors") },
    })
    for (const token of [utility, "card"]) {
      expect(linter.lint(button(`class="${token}"`), "Colors.vue")).toEqual([
        expect.objectContaining({
          rule: "no-raw-colors",
          className: token,
          file: "Colors.vue",
          line: 2,
          column: 19,
        }),
      ])
    }
  })

  it("rejects invalid applied utilities even with every rule disabled", async () => {
    await expect(
      createLinter({
        css: `${css} .card { @apply missing-utility; }`,
        config: { rules: Object.fromEntries(ruleNames.map((rule) => [rule, "off"])) },
      }),
    ).rejects.toThrow(/Cannot apply unknown utility class `missing-utility`/)
  })

  it.each(["no-restyle", "no-raw-colors"] as const)(
    "%s independently inspects nested custom declarations at the original SFC class",
    async (rule) => {
      const linter = await createLinter({
        css: `${css} .card { margin: 1rem; &:hover {
          @media (width > 10px) { &::before { color: red; } }
        } }`,
        config: { rules: only(rule) },
      })
      for (let count = 0; count < 2; count++) {
        expect(linter.lint(button('class="card"'), "Nested.vue")).toEqual([
          expect.objectContaining({
            rule,
            className: "card",
            file: "Nested.vue",
            line: 2,
            column: 19,
          }),
        ])
      }
    },
  )

  it("rejects nested descendants even with every rule disabled", async () => {
    await expect(
      createLinter({
        css: `${css} .card { & .child { color: red; } }`,
        config: { rules: Object.fromEntries(ruleNames.map((rule) => [rule, "off"])) },
      }),
    ).rejects.toThrow(/Unable to inspect CSS: unsupported selector/)
  })

  it.each(["no-restyle", "no-raw-colors"] as const)(
    "%s independently rejects custom colors overlapping a layout utility",
    async (rule) => {
      const linter = await createLinter({
        css: `${css} .mt-4 { color: red; }`,
        config: { rules: only(rule) },
      })
      expect(linter.lint(button('class="mt-4"'), "Overlap.vue")).toEqual([
        expect.objectContaining({
          rule,
          className: "mt-4",
          file: "Overlap.vue",
          line: 2,
          column: 19,
        }),
      ])
    },
  )

  it.each(["no-restyle", "no-raw-colors"] as const)(
    "%s independently inspects custom CSS on marker classes",
    async (rule) => {
      const plain = await createLinter({ css, config: { rules: only(rule) } })
      const custom = await createLinter({
        css: `${css} .group, .peer, .dark { padding: 1rem; color: red; }`,
        config: { rules: only(rule) },
      })
      for (const marker of ["group", "peer", "dark"]) {
        const source = button(`class="${marker}"`)
        expect(plain.lint(source, "Marker.vue")).toEqual([])
        expect(custom.lint(source, "Marker.vue")).toEqual([
          expect.objectContaining({
            rule,
            className: marker,
            file: "Marker.vue",
            line: 2,
            column: 19,
          }),
        ])
      }
    },
  )

  it.each(["no-restyle", "no-raw-colors"] as const)(
    "%s attributes only supported positive selector classes",
    async (rule) => {
      const linter = await createLinter({
        css: `${css} [data-url="a.fake"] { color: red; }
          .fake, .ghost { margin: 1rem; }
          .card:not(.ghost), .other:hover, :is(.first, .second) { color: red; }`,
        config: { rules: only(rule) },
      })
      expect(linter.lint(button('class="fake ghost"'), "Selectors.vue")).toEqual([])
      for (const token of ["card", "other", "first", "second"]) {
        expect(linter.lint(button(`class="${token}"`), "Selectors.vue")).toEqual([
          expect.objectContaining({
            rule,
            className: token,
            file: "Selectors.vue",
            line: 2,
            column: 19,
          }),
        ])
      }
    },
  )

  it("reports attribute text and negated classes as unknown", async () => {
    const linter = await createLinter({
      css: `${css} [data-url="a.fake"] { color: red; } .card:not(.ghost) { color: red; }`,
      config: { rules: only("no-unknown-classes") },
    })
    for (const token of ["fake", "ghost"]) {
      expect(linter.lint(button(`class="${token}"`), "Selectors.vue")).toEqual([
        expect.objectContaining({
          rule: "no-unknown-classes",
          className: token,
          file: "Selectors.vue",
          line: 2,
          column: 19,
        }),
      ])
    }
    expect(linter.lint(button('class="card"'))).toEqual([])
  })

  it.each([String.raw`.hover\:card`, ".card:has(.child)"])(
    "rejects unsupported selector %s even with all rules off",
    async (selector) => {
      await expect(
        createLinter({
          css: `${css} ${selector} { color: red; }`,
          config: { rules: Object.fromEntries(ruleNames.map((rule) => [rule, "off"])) },
        }),
      ).rejects.toThrow(/Unable to inspect CSS: unsupported selector/)
    },
  )

  it("reports unknown slot classes only within slot content", async () => {
    const linter = await createLinter({ css, config: { rules: only("require-static-classes") } })
    const source = `<script setup>const local = 'p-2';</script>
<template>
  <Box v-slot="{ local, cn }" :class="[local, cn('m-2')]">
    <div :class="local" />
    <div :class="cn('m-2')" />
  </Box>
  <div :class="local" />
</template>`
    expect(linter.lint(source, "Slot.vue")).toEqual([
      expect.objectContaining({
        rule: "require-static-classes",
        file: "Slot.vue",
        line: 4,
        column: 10,
      }),
      expect.objectContaining({
        rule: "require-static-classes",
        file: "Slot.vue",
        line: 5,
        column: 10,
      }),
    ])
  })

  it("reports shadowed helper calls at their original class attributes", async () => {
    const linter = await createLinter({ css, config: { rules: only("require-static-classes") } })
    const source = `<script setup>
function cn() { throw new Error('never run') }
</script>
<template>
  <div :class="cn('p-2')" />
  <Box v-slot="{ clsx }">
    <div :class="clsx('p-4')" />
  </Box>
  <div v-for="twMerge in rows" :class="twMerge('p-6')" />
  <div :class="clsx('m-2')" />
</template>`
    expect(linter.lint(source, "Helpers.vue")).toEqual([
      expect.objectContaining({
        rule: "require-static-classes",
        file: "Helpers.vue",
        line: 5,
        column: 8,
      }),
      expect.objectContaining({
        rule: "require-static-classes",
        file: "Helpers.vue",
        line: 7,
        column: 10,
      }),
      expect.objectContaining({
        rule: "require-static-classes",
        file: "Helpers.vue",
        line: 9,
        column: 32,
      }),
    ])
  })

  it("enforces all six rules on Vue", async () => {
    const linter = await createLinter({ css })
    const result = linter.lint(
      button(
        'class="p-[13px] bg-red-500 rounded-huge" :class="`text-${size}`" style="padding: 1px"',
      ),
      "Page.vue",
    )
    expect(new Set(result.map((item) => item.rule))).toEqual(new Set(ruleNames))
    expect(
      result.every((item) => item.line === 2 && item.column > 1 && item.file === "Page.vue"),
    ).toBe(true)
  })
  it("reports raw colors after quoted and escaped variant delimiters", async () => {
    const linter = await createLinter({ css, config: { rules: only("no-raw-colors") } })
    const tokens = [
      "[&[data-x='(']]:bg-[red]",
      '[&[data-x=")"]]:bg-[red]',
      "[&[data-x='[']]:bg-[red]",
      '[&[data-x="]"]]:bg-[red]',
      String.raw`[&.foo\(]:bg-[red]`,
      String.raw`[&.foo\)]:bg-[red]`,
      String.raw`[&.foo\[]:bg-[red]`,
      String.raw`[&.foo\]]:bg-[red]`,
    ]
    const classes = [...tokens, "[&[data-x='(']]:bg-primary"]
      .join(" ")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
    expect(
      linter.lint(`<template><div class="${classes}" /></template>`).map((item) => item.className),
    ).toEqual(tokens)
  })
  it("allows layout while rejecting component appearance", async () => {
    const linter = await createLinter({ css, config: { rules: only("no-restyle") } })
    expect(linter.lint(button('class="mt-4 w-full"'))).toEqual([])
    expect(
      linter.lint(button('class="p-4 hover:rounded-full"')).map((item) => item.className),
    ).toEqual(["p-4", "hover:rounded-full"])
    expect(linter.lint('<template><div class="p-4" /></template>')).toEqual([])
  })
  it.each([
    [{}, "color"],
    [{ allow: [] }, "layout"],
    [{ allow: ["layout"] }, "color"],
    [{ allow: ["color"] }, "layout"],
    [{ allow: ["layout", "color"] }, false],
    [{ allow: ["card-title"] }, false],
    [{ allow: ["card-*"] }, false],
    [{ allow: ["*"], deny: ["color"] }, "color"],
    [{ allow: ["layout", "color"], deny: ["card-*"] }, "color"],
  ])("requires every mixed category unless the token is allowed: %j", async (options, rejected) => {
    const linter = await createLinter({
      css: `${css} .card-title { color: var(--color-primary); margin: 1rem; }`,
      config: { rules: only("no-restyle", { ...options, message: "blocked {{category}}" }) },
    })
    const result = linter.lint(button('class="card-title"'))
    expect(result).toHaveLength(rejected ? 1 : 0)
    if (rejected) expect(result[0].message).toBe(`blocked ${rejected}`)
  })
  it("normalizes variants and markers but matches colon patterns against the full token", async () => {
    const linter = await createLinter({
      css,
      config: {
        rules: only("no-restyle", {
          allow: ["mt-4", "bg-*", "hover:!p-4", "[color:var(--color-primary)]"],
          deny: ["focus:bg-*"],
        }),
      },
    })
    const tokens = [
      "[&:not(:hover)]:!-mt-4",
      "hover:-mt-4!",
      "hover:bg-(color:--color-primary)",
      "hover:!p-4",
      "focus:!p-4",
      "hover:p-4!",
      "[color:var(--color-primary)]",
      "hover:[color:var(--color-primary)]",
      "focus:bg-(color:--color-primary)",
    ]
    expect(
      linter.lint(button(`class="${tokens.join(" ")}"`)).map((item) => item.className),
    ).toEqual([
      "focus:!p-4",
      "hover:p-4!",
      "hover:[color:var(--color-primary)]",
      "focus:bg-(color:--color-primary)",
    ])
  })
  it("supports first matching contracts, inherited options, deny precedence and messages", async () => {
    const config = defineConfig({
      note: "See DESIGN.md.",
      rules: only("no-restyle", {
        allow: ["layout"],
        contracts: [
          {
            pattern: "^Button$",
            allow: ["spacing", "w-full"],
            deny: ["px-*"],
            message: "{{className}} violates {{component}} {{category}} in {{file}}.",
          },
          { pattern: ".*", allow: ["*"] },
        ],
      }),
    })
    const linter = await createLinter({ css, config })
    const result = linter.lint(button('class="p-4 w-full px-2 mt-4"'), "Page.vue")
    expect(result.map((item) => item.className)).toEqual(["px-2", "mt-4"])
    expect(result[0].message).toBe("px-2 violates Button spacing in Page.vue. See DESIGN.md.")
  })
  it("recognizes configured imports and global components and honors exclusions", async () => {
    const linter = await createLinter({
      css,
      config: {
        ui: ["@acme/ui"],
        components: ["^GlobalButton$"],
        ignoreImports: ["/internal$"],
        rules: only("no-restyle"),
      },
    })
    expect(linter.lint('<template><GlobalButton class="p-4" /></template>')).toHaveLength(1)
    expect(
      linter.lint(
        '<script setup>import Button from "@acme/uix"</script><template><Button class="p-4" /></template>',
      ),
    ).toEqual([])
    expect(
      linter.lint(
        '<script setup>import Button from "@acme/ui/internal"</script><template><Button class="p-4" /></template>',
      ),
    ).toEqual([])
  })
  it("exempts vocabulary classes but deny still wins", async () => {
    const linter = await createLinter({
      css,
      config: { rules: only("no-arbitrary-values", { allow: ["p-*"], deny: ["p-[13px]"] }) },
    })
    const result = linter.lint(
      '<template><div class="p-[12px] p-[13px] hover:p-[14px] [&amp;>span]:mt-4 bg-(--primary)" /></template>',
    )
    expect(result.map((item) => item.className)).toEqual(["p-[13px]"])
  })
  it("checks native element classes and ignores arbitrary variants", async () => {
    const linter = await createLinter({ css, config: { rules: only("no-arbitrary-values") } })
    expect(
      linter.lint('<template><div class="[&amp;>span]:mt-4 p-(--space)" /></template>'),
    ).toEqual([])
    expect(
      linter.lint('<template><div class="hover:p-[13px] [color:red]" /></template>'),
    ).toHaveLength(2)
  })
  it("uses warning severities and reports parse failures even with rules disabled", async () => {
    const linter = await createLinter({
      css,
      config: { rules: { ...only("no-arbitrary-values"), "no-arbitrary-values": "warn" } },
    })
    expect(linter.lint('<template><div class="p-[13px]" /></template>')[0].severity).toBe("warn")
    expect(linter.lint("<template><div></template>")[0].rule).toBe("parse-error")
  })
  it("detects arbitrary opacity and line-height modifiers", async () => {
    const linter = await createLinter({ css, config: { rules: only("no-arbitrary-values") } })
    const result = linter.lint(
      '<template><div class="text-sm/[17px] bg-red-500/[0.37] [&amp;>span]:mt-4 text-sm/(--leading)" /></template>',
    )
    expect(result.map((item) => item.className)).toEqual(["text-sm/[17px]", "bg-red-500/[0.37]"])
  })
  it("rejects bad configuration before linting", () => {
    expect(() => defineConfig({ rules: { typo: "error" } } as Config)).toThrow("Unknown rule")
    expect(() =>
      defineConfig({ rules: only("no-restyle", { contracts: [{ pattern: "[" }] }) }),
    ).toThrow("Invalid regular expression")
    expect(() => defineConfig({ rules: only("no-restyle", { message: "{{missing}}" }) })).toThrow(
      "Unknown message placeholder",
    )
    expect(() => defineConfig({ ui: "invalid" } as unknown as Config)).toThrow("array")
    expect(() => defineConfig({ rules: only("require-static-classes", { allow: ["*"] }) })).toThrow(
      "not allow/deny",
    )
  })
})
