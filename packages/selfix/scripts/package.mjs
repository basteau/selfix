import { copyFileSync } from "node:fs"

for (const file of ["README.md", "LICENSE"]) {
  copyFileSync(new URL(`../../../${file}`, import.meta.url), new URL(`../${file}`, import.meta.url))
}
