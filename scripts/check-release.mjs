import assert from "node:assert/strict"
import { appendFileSync, readFileSync } from "node:fs"

const pkg = JSON.parse(readFileSync("packages/selfix/package.json", "utf8"))
const { GITHUB_EVENT_NAME, GITHUB_REF_TYPE, GITHUB_REF_NAME, GITHUB_REPOSITORY } = process.env

assert.equal(GITHUB_EVENT_NAME, "push", "Releases must come from a push event")
assert.equal(GITHUB_REF_TYPE, "tag", "Releases must come from a Git tag")
assert.equal(pkg.name, "selfix", "Only the selfix package can be released")
assert.ok(!pkg.private, "The release package must not be private")
assert.equal(typeof pkg.version, "string", "Package version must be a string")
const version = pkg.version.match(
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(alpha|beta)\.(?:0|[1-9]\d*))?$/,
)
assert.ok(
  version,
  "Only stable X.Y.Z or prerelease X.Y.Z-alpha.N / X.Y.Z-beta.N versions are supported",
)
assert.equal(GITHUB_REF_NAME, `v${pkg.version}`, "The Git tag must match the package version")
assert.ok(
  GITHUB_REPOSITORY && !GITHUB_REPOSITORY.startsWith("OWNER/"),
  "Replace the placeholder GitHub repository before releasing",
)
assert.equal(
  pkg.repository?.url,
  `git+https://github.com/${GITHUB_REPOSITORY}.git`,
  "repository.url must match the publishing GitHub repository",
)
assert.equal(
  pkg.repository?.directory,
  "packages/selfix",
  "repository.directory must point to packages/selfix",
)
const changelog = readFileSync("CHANGELOG.md", "utf8")
assert.ok(
  changelog.split("\n").some((line) => line.trim() === `## v${pkg.version}`),
  "Prepare CHANGELOG.md for this version before tagging",
)
const npmTag = version[1] ?? "latest"
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `npm_tag=${npmTag}\n`)
console.log(`Release validated: selfix@${pkg.version} (npm tag: ${npmTag})`)
