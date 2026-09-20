import { readFile } from "node:fs/promises"
import { runInNewContext } from "node:vm"
import { expect, test } from "vitest"

const script = await readFile(new URL("./scripts/landing.js", import.meta.url), "utf8")

test("copy controls work after returning from docs and recover from clipboard failure", async () => {
  let initialize = () => {}
  let click = async () => {}
  let copied = ""
  let reject = false
  const status = { textContent: "" }
  const button = {
    hidden: true,
    textContent: "Copy",
    dataset: { copy: "command" },
    addEventListener: (_name: string, handler: typeof click) => {
      click = handler
    },
  }
  runInNewContext(script, {
    document: {
      addEventListener: (_name: string, handler: typeof initialize) => {
        initialize = handler
      },
      querySelectorAll: () => [button],
      getElementById: (id: string) =>
        id === "copy-status" ? status : { textContent: "pnpm add -D selfix" },
    },
    navigator: {
      clipboard: {
        writeText: async (text: string) => {
          if (reject) throw new Error("Permission denied")
          copied = text
        },
      },
    },
    clearTimeout() {},
    setTimeout() {},
  })
  initialize()
  expect(button.hidden).toBe(false)
  await click()
  expect(copied).toBe("pnpm add -D selfix")
  expect(status.textContent).toBe("Copied to clipboard.")
  initialize()
  reject = true
  await click()
  expect(button.textContent).toBe("Retry")
  expect(status.textContent).toContain("Select the code")
  reject = false
  await click()
  expect(button.textContent).toBe("Copied")
})
