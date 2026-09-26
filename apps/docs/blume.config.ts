import { defineConfig } from "blume"
import { isSatteriProcessor } from "@astrojs/markdown-satteri"
import { markdownLinks } from "./markdown-links.js"

export default defineConfig({
  title: "selfix",
  description:
    "Lint Vue 3 templates against your components and Tailwind CSS 4 theme. selfix catches overrides, raw colors, and typos before they ship.",
  logo: { image: "/logo.svg", text: "selfix" },
  content: { root: "content" },
  basePath: "/docs",
  integrations: [
    {
      name: "selfix-source-links",
      hooks: {
        "astro:config:setup": ({ config }) => {
          const processor = config.markdown.processor
          if (!isSatteriProcessor(processor)) {
            throw new Error("selfix docs require Blume's Satteri Markdown processor")
          }
          processor.options.mdastPlugins.push(
            markdownLinks(`${config.base.replace(/\/$/, "")}/docs`),
          )
        },
      },
    },
  ],
  github: { owner: "basteau", repo: "selfix", branch: "main", dir: "apps/docs" },
  theme: { accent: { light: "#287f5b", dark: "#62c99b" }, mode: "system" },
  seo: {
    og: {
      fonts: [
        { name: "Spline Sans", src: "public/fonts/spline-sans/SplineSans[wght].ttf", weight: 500 },
      ],
      logo: "public/logo.svg",
      titles: { "/": "selfix, the design-system linter for Vue and Tailwind" },
      palette: {
        accent: "#42b883",
        background: "#ffffff",
        foreground: "#171717",
        muted: "#666666",
        border: "#e5e5e5",
      },
    },
  },
  navigation: {
    actions: [{ label: "Documentation", href: "/docs" }],
    sidebar: [
      "/",
      { label: "Get started", items: ["/getting-started", "/adoption", "/agent-setup"] },
      { label: "Recipes", items: ["/shadcn-vue", "/nuxt", "/ci"] },
      {
        label: "Guides",
        items: ["/how-it-works", "/themes", "/analysis", "/troubleshooting"],
      },
      {
        label: "Rules",
        items: [
          "/rules",
          "/no-restyle",
          "/no-raw-colors",
          "/no-unknown-classes",
          "/no-arbitrary-values",
          "/no-inline-styles",
          "/require-static-classes",
          "/no-restricted-components",
        ],
      },
      { label: "Reference", items: ["/configuration", "/cli", "/api"] },
      { label: "Contributing", items: ["/maintaining", "/releasing"] },
    ],
  },
  ai: { llmsTxt: true },
  deployment: { output: "static", site: process.env.SITE_URL || "https://selfix.exe.xyz" },
})
