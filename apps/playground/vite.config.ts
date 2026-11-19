import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import ui from "@nuxt/ui/vite"

// The Nuxt UI plugin brings Tailwind CSS and writes the generated theme that
// selfix reads to node_modules/.nuxt-ui.
export default defineConfig({ plugins: [vue(), ui({ router: false })] })
