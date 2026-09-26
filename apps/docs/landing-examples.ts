// Findings shown in the landing-page hero; a trailing … marks a shortened message. landing-example.test.ts lints each
// source with this theme and checks the displayed location, message, and fix.
export const theme = `@import "tailwindcss";

@theme {
  --color-primary: oklch(0.55 0.15 160);
  --color-danger: oklch(0.58 0.2 25);
}`

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

const button = `<script setup lang="ts">
import { Button } from "@/components/ui"
</script>

<template>
  <Button class="p-4">Save</Button>
</template>`

const color = `<template>
  <p class="text-red-600">Payment failed</p>
</template>`

const typo = `<template>
  <ul class="flex flex-cols gap-2">
    <li>Draft</li>
  </ul>
</template>`

export const examples: LandingExample[] = [
  {
    id: "override",
    label: "Override",
    source: button,
    token: "p-4",
    location: "6:11",
    rule: "no-restyle",
    message: `"p-4" is not allowed on <Button>: spacing changes are outside the component's contract. …`,
    detail:
      "Remove this override. Check the component's documented spacing props and its contract before changing surrounding layout.",
    help: "The Button owns its padding. The page still controls where it sits.",
    fixLabel: "Allowed layout",
    fix: `<Button class="mt-4 w-full">Save</Button>`,
    fixed: button.replace('class="p-4"', 'class="mt-4 w-full"'),
  },
  {
    id: "color",
    label: "Raw color",
    source: color,
    token: "text-red-600",
    location: "2:6",
    rule: "no-raw-colors",
    message: `Replace "text-red-600" with a semantic theme color (danger, primary).`,
    help: "Palette colors stay fixed when you change your theme. Theme colors follow it.",
    fixLabel: "Theme color",
    fix: `<p class="text-danger">Payment failed</p>`,
    fixed: color.replace("text-red-600", "text-danger"),
  },
  {
    id: "typo",
    label: "Typo",
    source: typo,
    token: "flex-cols",
    location: "2:7",
    rule: "no-unknown-classes",
    message: `Tailwind cannot generate "flex-cols". …`,
    suggestion: "flex-col",
    help: "selfix asks Tailwind whether each class exists and suggests a fix when only one class is a close match.",
    fixLabel: "Suggested fix",
    fix: `<ul class="flex flex-col gap-2">`,
    fixed: typo.replace("flex-cols", "flex-col"),
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
    summary: "Pages can position a component but not restyle it.",
    bad: `<Button class="p-4">`,
    good: `<Button class="mt-4">`,
  },
  {
    name: "no-raw-colors",
    summary: "Colors come from your theme, not the palette or hex values.",
    bad: "bg-red-500",
    good: "bg-danger",
  },
  {
    name: "no-unknown-classes",
    summary: "Every class must exist in your Tailwind CSS.",
    bad: "bg-prmary",
    good: "bg-primary",
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
    good: "<Button>",
  },
]
