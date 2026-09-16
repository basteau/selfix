import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
  rules: {
    "no-restyle": [
      "error",
      {
        contracts: [
          {
            pattern: "^Button$",
            allow: ["layout"],
            message:
              "Button owns its appearance. Use its variant prop; keep only layout classes here.",
          },
        ],
      },
    ],
  },
})
