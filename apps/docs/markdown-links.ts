import type { satteri } from "@astrojs/markdown-satteri"

type Plugin = NonNullable<NonNullable<Parameters<typeof satteri>[0]>["mdastPlugins"]>[number]

// Content pages are siblings. Keep their .md links usable on GitHub, but send
// website readers to HTML routes rather than Blume's raw Markdown endpoints.
export function markdownLinks(base: string): Plugin {
  const route = (url: string) => {
    const match = /^(?:\.\/)?([a-z][a-z0-9-]*)\.md([#?].*)?$/.exec(url)
    if (!match) return url
    return `${base.replace(/\/$/, "")}/${match[1] === "index" ? "" : match[1]}${match[2] ?? ""}`
  }
  return {
    name: "selfix-markdown-links",
    link(node, context) {
      if (node.url) context.setProperty(node, "url", route(node.url))
    },
    definition(node, context) {
      if (node.url) context.setProperty(node, "url", route(node.url))
    },
  }
}
