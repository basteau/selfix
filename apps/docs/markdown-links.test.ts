import { satteri } from "@astrojs/markdown-satteri"
import { expect, test } from "vitest"
import { markdownLinks } from "./markdown-links.js"

test("renders source links as site pages while preserving anchors and code examples", async () => {
  const renderer = await satteri({ mdastPlugins: [markdownLinks("/selfix/")] }).createRenderer({
    syntaxHighlight: false,
  })
  const result = await renderer.render(
    [
      "[Configuration](configuration.md#component-recognition)",
      "[Home](index.md)",
      "[Rules][rules]\n\n[rules]: rules.md#no-restyle",
      "[External](https://example.com/guide.md)",
      "[Download](/rules.md)",
      "`[Example](configuration.md)`",
      "```md\n[Example](configuration.md)\n```",
    ].join("\n\n"),
  )
  expect(result.code).toContain('href="/selfix/configuration#component-recognition"')
  expect(result.code).toContain('href="/selfix/"')
  expect(result.code).toContain('href="/selfix/rules#no-restyle"')
  expect(result.code).toContain('href="https://example.com/guide.md"')
  expect(result.code).toContain('href="/rules.md"')
  expect(result.code).toContain("<code>[Example](configuration.md)</code>")
  expect(result.code).toContain("[Example](configuration.md)\n</code>")
})
