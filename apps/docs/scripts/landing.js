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
})
