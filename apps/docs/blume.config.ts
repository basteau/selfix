import { defineConfig } from "blume"
import { isSatteriProcessor } from "@astrojs/markdown-satteri"
import { markdownLinks } from "./markdown-links.js"

export default defineConfig({
  title: "selfix",
  description: "Design-system linting for Vue 3 and Tailwind CSS 4.",
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
      logo: false,
      titles: { "/": "Keep your Vue components consistent." },
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
      { label: "Get started", items: ["/getting-started", "/adoption"] },
      { label: "Guides", items: ["/themes", "/agent-setup", "/analysis", "/troubleshooting"] },
      { label: "Reference", items: ["/rules", "/configuration", "/cli", "/api"] },
      { label: "Contributing", items: ["/maintaining"] },
    ],
  },
  ai: { llmsTxt: true },
  deployment: { output: "static", site: process.env.DOCS_SITE_URL || "https://selfix.dev" },
})
