import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui", "./Button.vue"],
  overrides: [
    {
      files: ["src/components/ui/**/*.vue"],
      rules: { "no-inline-styles": "off", "no-restyle": "off" },
    },
  ],
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
