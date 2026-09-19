import { defineConfig } from "blume"
import { isSatteriProcessor } from "@astrojs/markdown-satteri"
import { markdownLinks } from "./markdown-links.js"

export default defineConfig({
  title: "selfix",
  description: "Design-system linting for Vue 3 and Tailwind CSS 4.",
  content: { root: "content" },
  integrations: [
    {
      name: "selfix-source-links",
      hooks: {
        "astro:config:setup": ({ config }) => {
          const processor = config.markdown.processor
          if (!isSatteriProcessor(processor)) {
            throw new Error("selfix docs require Blume's Satteri Markdown processor")
          }
          processor.options.mdastPlugins.push(markdownLinks(config.base))
        },
      },
    },
  ],
  github: { owner: "basteau", repo: "selfix", branch: "main", dir: "apps/docs" },
  theme: { accent: "teal", mode: "system" },
  navigation: {
    sidebar: [
      "/",
      { label: "Get started", items: ["/getting-started", "/adoption"] },
      { label: "Guides", items: ["/themes", "/agent-setup", "/analysis", "/troubleshooting"] },
      { label: "Reference", items: ["/rules", "/configuration", "/cli", "/api"] },
      { label: "Contributing", items: ["/maintaining"] },
    ],
  },
  ai: { llmsTxt: true },
  deployment: { output: "static", site: process.env.DOCS_SITE_URL },
})
