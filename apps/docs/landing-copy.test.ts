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
      querySelectorAll: (selector: string) => (selector === "[data-copy]" ? [button] : []),
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

test("example tabs switch panels with clicks and arrow keys", () => {
  let initialize = () => {}
  const handlers = new Map<string, Map<string, (event?: unknown) => void>>()
  const panels = new Map(
    ["a", "b", "c"].map((id) => {
      const classes = new Set<string>()
      return [
        id,
        {
          classes,
          attributes: new Map<string, string>(),
          setAttribute(name: string, value: string) {
            this.attributes.set(name, value)
          },
          classList: {
            toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
          },
        },
      ]
    }),
  )
  const tabs = ["a", "b", "c"].map((id, index) => {
    const attributes = new Map([
      ["aria-controls", id],
      ["aria-selected", String(index === 0)],
    ])
    handlers.set(id, new Map())
    return {
      id,
      tabIndex: 0,
      focused: false,
      getAttribute: (name: string) => attributes.get(name),
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      addEventListener: (name: string, handler: (event?: unknown) => void) =>
        handlers.get(id)!.set(name, handler),
      focus() {
        this.focused = true
      },
    }
  })
  const classes = new Set<string>()
  const list = {
    hidden: true,
    querySelectorAll: () => tabs,
    parentElement: { classList: { add: (name: string) => classes.add(name) } },
  }
  runInNewContext(script, {
    document: {
      addEventListener: (_name: string, handler: typeof initialize) => {
        initialize = handler
      },
      querySelectorAll: (selector: string) => (selector === "[data-tabs]" ? [list] : []),
      getElementById: (id: string) => panels.get(id),
    },
  })
  initialize()
  const visible = () =>
    [...panels].filter(([, panel]) => !panel.classes.has("is-inactive")).map(([id]) => id)
  expect(list.hidden).toBe(false)
  expect(classes.has("has-tabs")).toBe(true)
  expect(visible()).toEqual(["a"])
  expect(panels.get("b")?.attributes.get("role")).toBe("tabpanel")
  handlers.get("c")!.get("click")!()
  expect(visible()).toEqual(["c"])
  expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, -1, 0])
  let prevented = false
  handlers.get("c")!.get("keydown")!({
    key: "ArrowRight",
    preventDefault: () => (prevented = true),
  })
  expect(prevented).toBe(true)
  expect(visible()).toEqual(["a"])
  expect(tabs[0]?.focused).toBe(true)
  handlers.get("a")!.get("keydown")!({ key: "End", preventDefault() {} })
  expect(visible()).toEqual(["c"])
})

function packageSwitchPage(localStorage: unknown) {
  let initialize = () => {}
  const managers = ["pnpm", "npm", "yarn", "bun"]
  const commands = ["add", "exec"].map((verb) => ({
    dataset: Object.fromEntries(managers.map((manager) => [manager, `${manager} ${verb}`])),
    textContent: "pnpm " + verb,
  }))
  const clicks = new Map<string, () => void>()
  const buttons = managers.map((manager) => {
    const attributes = new Map<string, string>()
    return {
      dataset: { pmChoice: manager },
      attributes,
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      addEventListener: (_name: string, handler: () => void) => clicks.set(manager, handler),
    }
  })
  const group = { hidden: true }
  const elements: Record<string, unknown[]> = {
    "[data-pm-command]": commands,
    "[data-pm-choice]": buttons,
    "[data-pm-switch]": [group],
  }
  runInNewContext(script, {
    localStorage,
    document: {
      addEventListener: (_name: string, handler: typeof initialize) => {
        initialize = handler
      },
      querySelectorAll: (selector: string) => elements[selector] ?? [],
    },
  })
  initialize()
  const pressed = () => buttons.map((button) => button.attributes.get("aria-pressed"))
  return { commands, clicks, group, pressed, text: () => commands.map((c) => c.textContent) }
}

test("package manager switches update every command and restore the saved choice", () => {
  const storage = new Map([["selfix-package-manager", "bun"]])
  const page = packageSwitchPage({
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  })
  expect(page.group.hidden).toBe(false)
  expect(page.text()).toEqual(["bun add", "bun exec"])
  page.clicks.get("yarn")!()
  expect(page.text()).toEqual(["yarn add", "yarn exec"])
  expect(page.pressed()).toEqual(["false", "false", "true", "false"])
  expect(storage.get("selfix-package-manager")).toBe("yarn")
})

test("package manager switches ignore unknown values and blocked storage", () => {
  const unknown = packageSwitchPage({ getItem: () => "deno", setItem() {} })
  expect(unknown.text()).toEqual(["pnpm add", "pnpm exec"])
  const blocked = packageSwitchPage({
    getItem() {
      throw new Error("SecurityError")
    },
    setItem() {
      throw new Error("SecurityError")
    },
  })
  blocked.clicks.get("npm")!()
  expect(blocked.text()).toEqual(["npm add", "npm exec"])
})
