import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, expect, test } from "vitest"
import { baseCandidate, createTailwind } from "../src/tailwind.js"

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
