import { execFileSync, spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, expect, it } from "vitest"

const root = fileURLToPath(new URL("../../../", import.meta.url))
const workspace = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
const prepareArgs = workspace.scripts["release:prepare"].split(" ").slice(1)
const changelogen = path.join(root, "node_modules/changelogen/dist/cli.mjs")
const guard = path.join(root, "scripts/check-release.mjs")
const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function fixture() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "selfix-release-"))
  dirs.push(dir)
  mkdirSync(path.join(dir, "packages/selfix"), { recursive: true })
  mkdirSync(path.join(dir, "apps/playground"), { recursive: true })
  const pkg = JSON.parse(readFileSync(path.join(root, "packages/selfix/package.json"), "utf8"))
  pkg.version = "0.1.0"
  pkg.repository.url = "git+https://github.com/example/selfix.git"
  const save = () =>
    writeFileSync(path.join(dir, "packages/selfix/package.json"), JSON.stringify(pkg))
  save()
  writeFileSync(path.join(dir, "package.json"), '{"name":"workspace","private":true}')
  writeFileSync(
    path.join(dir, "apps/playground/package.json"),
    '{"name":"playground","private":true}',
  )
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
    }).trim()
  git("init", "-b", "main")
  git("config", "user.name", "Release test")
  git("config", "user.email", "test@example.invalid")
  git("add", ".")
  git("commit", "-m", "feat: initial implementation")
  const prepare = (...args: string[]) =>
    spawnSync(process.execPath, [changelogen, ...prepareArgs, ...args], {
      cwd: dir,
      encoding: "utf8",
    })
  const check = (env: Record<string, string> = {}) =>
    spawnSync(process.execPath, [guard], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF_TYPE: "tag",
        GITHUB_REF_NAME: "v0.1.0",
        GITHUB_REPOSITORY: "example/selfix",
        ...env,
      },
    })
  return { dir, pkg, save, git, prepare, check }
}

it("prepares the first 0.1.0 changelog without bumping, committing, or tagging", () => {
  const { dir, git, prepare, check } = fixture()
  const head = git("rev-parse", "HEAD")
  const result = prepare("--no-bump", "-r", "0.1.0")
  expect(result.status, result.stderr).toBe(0)
  const changelog = readFileSync(path.join(dir, "CHANGELOG.md"), "utf8")
  expect(changelog).toContain("## v0.1.0")
  expect(changelog).toContain("Initial implementation")
  expect(changelog).not.toContain("test@example.invalid")
  expect(git("diff")).toBe("")
  expect(git("rev-parse", "HEAD")).toBe(head)
  expect(git("tag", "--list")).toBe("")
  expect(check().status).toBe(0)
})

it("prepares an explicit later version only in the publishable package", () => {
  const { dir, git, prepare } = fixture()
  git("tag", "v0.1.0")
  writeFileSync(path.join(dir, "fix.txt"), "fixed")
  git("add", ".")
  git("commit", "-m", "fix(cli): improve diagnostics")
  const result = prepare("-r", "0.2.0")
  expect(result.status, result.stderr).toBe(0)
  expect(
    JSON.parse(readFileSync(path.join(dir, "packages/selfix/package.json"), "utf8")).version,
  ).toBe("0.2.0")
  expect(git("diff", "--name-only")).toBe("packages/selfix/package.json")
  const changelog = readFileSync(path.join(dir, "CHANGELOG.md"), "utf8")
  expect(changelog).toContain("## v0.2.0")
  expect(changelog).toContain("Improve diagnostics")
  expect(changelog).not.toContain("Initial implementation")
  expect(git("tag", "--list")).toBe("v0.1.0")
})

it("refuses release preparation with a dirty working tree", () => {
  const { dir, prepare } = fixture()
  writeFileSync(path.join(dir, "unreviewed.txt"), "unreviewed")
  const result = prepare("-r", "0.2.0")
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("Working directory is not clean")
  expect(
    JSON.parse(readFileSync(path.join(dir, "packages/selfix/package.json"), "utf8")).version,
  ).toBe("0.1.0")
})

it.each([
  [{ GITHUB_REF_NAME: "v0.2.0" }, "Git tag must match"],
  [{ GITHUB_REF_TYPE: "branch" }, "must come from a Git tag"],
  [{ GITHUB_EVENT_NAME: "pull_request" }, "must come from a push event"],
  [{ GITHUB_REPOSITORY: "another/selfix" }, "repository.url must match"],
  [{ GITHUB_REPOSITORY: "OWNER/selfix" }, "Replace the placeholder"],
] as const)("rejects unsafe release context %j", (env, message) => {
  const { check } = fixture()
  const result = check(env)
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain(message)
})

it.each([
  ["name", "other-package", "Only the selfix package"],
  ["private", true, "must not be private"],
  ["version", "0.1.0-beta.1", "Only stable versions"],
  ["version", "01.1.0", "Only stable versions"],
] as const)("rejects invalid package metadata: %s = %s", (key, value, message) => {
  const { pkg, save, check } = fixture()
  pkg[key] = value
  save()
  const result = check()
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain(message)
})

it("requires changelog notes for the tagged version", () => {
  const { dir, check } = fixture()
  writeFileSync(path.join(dir, "CHANGELOG.md"), "# Changelog\n\n## v0.0.1\n")
  const result = check()
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("Prepare CHANGELOG.md")
})
