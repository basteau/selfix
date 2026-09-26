// Blume uses Astro navigation; initialize controls on every visit to the landing page.
document.addEventListener("astro:page-load", () => {
  for (const button of document.querySelectorAll("[data-copy]")) {
    button.hidden = false
    let timer
    button.addEventListener("click", async () => {
      const code = document.getElementById(button.dataset.copy).textContent
      const status = document.getElementById("copy-status")
      clearTimeout(timer)
      try {
        await navigator.clipboard.writeText(code)
        button.textContent = "Copied"
        status.textContent = "Copied to clipboard."
      } catch {
        button.textContent = "Retry"
        status.textContent = "Could not copy. Select the code to copy it manually."
      }
      timer = setTimeout(() => {
        button.textContent = "Copy"
        status.textContent = ""
      }, 2500)
    })
  }

  // Without JavaScript every example panel stays visible with its own heading.
  for (const list of document.querySelectorAll("[data-tabs]")) {
    const tabs = [...list.querySelectorAll('[role="tab"]')]
    const select = (selected, focus) => {
      for (const tab of tabs) {
        const active = tab === selected
        tab.setAttribute("aria-selected", String(active))
        tab.tabIndex = active ? 0 : -1
        // Inactive panels keep their space so switching examples never shifts the page.
        document
          .getElementById(tab.getAttribute("aria-controls"))
          .classList.toggle("is-inactive", !active)
      }
      if (focus) selected.focus()
    }
    const keys = {
      ArrowRight: (index) => tabs[(index + 1) % tabs.length],
      ArrowLeft: (index) => tabs[(index - 1 + tabs.length) % tabs.length],
      Home: () => tabs[0],
      End: () => tabs[tabs.length - 1],
    }
    for (const tab of tabs) {
      tab.addEventListener("click", () => select(tab, false))
      tab.addEventListener("keydown", (event) => {
        const next = keys[event.key]?.(tabs.indexOf(tab))
        if (!next) return
        event.preventDefault()
        select(next, true)
      })
    }
    for (const tab of tabs) {
      const panel = document.getElementById(tab.getAttribute("aria-controls"))
      panel.setAttribute("role", "tabpanel")
      panel.setAttribute("aria-labelledby", tab.id)
    }
    list.hidden = false
    list.parentElement.classList.add("has-tabs")
    select(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0], false)
  }
})
