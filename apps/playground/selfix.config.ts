import { defineConfig } from "selfix"

// selfix finds the stylesheet, the Nuxt UI theme, and its components on its own.
// This contract gives callers one more freedom: spacing inside a card.
export default defineConfig({
  rules: {
    "no-restyle": ["error", { contracts: [{ pattern: "^UCard$", allow: ["layout", "spacing"] }] }],
  },
})
