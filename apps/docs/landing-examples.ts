// Findings shown in the landing-page hero; a trailing … marks a shortened message. landing-example.test.ts lints each
// source in a Nuxt UI project and checks the displayed location, message, and fix.
export interface LandingExample {
  id: string
  label: string
  source: string
  token: string
  location: string
  rule: string
  message: string
  suggestion?: string
  // The rest of a shortened message, shown where the full CLI line appears.
  detail?: string
  help: string
  fixLabel: string
  fix: string
  fixed: string
}

const button = `<template>
  <UButton class="p-4">Save</UButton>
</template>`

const color = `<template>
  <p class="text-gray-500">Saved a minute ago</p>
</template>`

const native = `<template>
  <button type="submit">Save</button>
</template>`

export const examples: LandingExample[] = [
  {
    id: "override",
    label: "Override",
    source: button,
    token: "p-4",
    location: "2:12",
    rule: "no-restyle",
    message: `"p-4" is not allowed on <UButton>: the component owns its spacing. …`,
    detail:
      "Use size (xs, sm, md, lg, xl), or restyle it for the whole app under ui.button in app.config.ts.",
    help: "Nuxt UI owns the button's padding. The finding lists the sizes your theme has.",
    fixLabel: "A size from your theme",
    fix: `<UButton size="lg" class="mt-4 w-full">Save</UButton>`,
    fixed: button.replace('class="p-4"', 'size="lg" class="mt-4 w-full"'),
  },
  {
    id: "color",
    label: "Raw color",
    source: color,
    token: "text-gray-500",
    location: "2:6",
    rule: "no-raw-colors",
    message: `Replace "text-gray-500" with a theme color such as text-dimmed, text-muted, …`,
    help: "Palette colors ignore your theme. Nuxt UI's semantic colors follow it, in light and dark mode.",
    fixLabel: "Theme color",
    fix: `<p class="text-muted">Saved a minute ago</p>`,
    fixed: color.replace("text-gray-500", "text-muted"),
  },
  {
    id: "native",
    label: "Native element",
    source: native,
    token: "button",
    location: "2:3",
    rule: "prefer-ui-components",
    message: "Use <UButton> instead of a native <button>, so it follows the design system.",
    help: "A native button skips your theme. selfix names the Nuxt UI component your installed version ships.",
    fixLabel: "Nuxt UI component",
    fix: `<UButton type="submit">Save</UButton>`,
    fixed: native.replace(
      '<button type="submit">Save</button>',
      '<UButton type="submit">Save</UButton>',
    ),
  },
]

export interface RuleExample {
  name: string
  summary: string
  bad: string
  good: string
}

// Rules ordered by impact. The test lints each bad and good case.
export const rules: RuleExample[] = [
  {
    name: "no-restyle",
    summary: "Pages can position a Nuxt UI component but not restyle it, in class or ui.",
    bad: `<UButton class="p-4">`,
    good: `<UButton size="lg">`,
  },
  {
    name: "prefer-ui-components",
    summary: "Native elements give way to the Nuxt UI component that replaces them.",
    bad: "<button>",
    good: "<UButton>",
  },
  {
    name: "no-raw-colors",
    summary: "Colors come from your theme, not the palette or hex values.",
    bad: "text-gray-500",
    good: "text-muted",
  },
  {
    name: "no-unknown-classes",
    summary: "Every class must exist in your theme. A clear typo gets a suggestion.",
    bad: "text-mutd",
    good: "text-muted",
  },
  {
    name: "no-arbitrary-values",
    summary: "Spacing and sizes stay on your theme's scale.",
    bad: "p-[13px]",
    good: "p-3",
  },
  {
    name: "no-inline-styles",
    summary: "Styling lives in classes that selfix can check.",
    bad: `style="padding: 1rem"`,
    good: `class="p-4"`,
  },
  {
    name: "require-static-classes",
    summary: "Write class names in full so selfix can read them.",
    bad: ':class="`mt-${size}`"',
    good: `:class="big ? 'mt-4' : 'mt-2'"`,
  },
  {
    name: "no-restricted-components",
    summary: "selfix reports components you ban and names the replacement you set.",
    bad: "<OldButton>",
    good: "<UButton>",
  },
]
