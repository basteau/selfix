import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, expect, it } from "vitest"

const root = fileURLToPath(new URL("../../../", import.meta.url))
const workspace = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
const prepareArgs = workspace.scripts["release:prepare"].split(" ").slice(1)
const changelogen = path.join(root, "node_modules/changelogen/dist/cli.mjs")
const guard = path.join(root, "scripts/check-release.mjs")
const workflow = readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8")
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
    spawnSync(process.execPath, [guard, path.join(dir, "release-notes.md")], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF_TYPE: "tag",
        GITHUB_REF_NAME: "v0.1.0",
        GITHUB_REPOSITORY: "example/selfix",
        GITHUB_OUTPUT: path.join(dir, "github-output"),
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

it("prepares the first alpha without committing or tagging", () => {
  const { dir, git, prepare, check } = fixture()
  const head = git("rev-parse", "HEAD")
  const result = prepare("-r", "0.1.0-alpha.0")
  expect(result.status, result.stderr).toBe(0)
  expect(
    JSON.parse(readFileSync(path.join(dir, "packages/selfix/package.json"), "utf8")).version,
  ).toBe("0.1.0-alpha.0")
  expect(readFileSync(path.join(dir, "CHANGELOG.md"), "utf8")).toContain("## v0.1.0-alpha.0")
  expect(git("rev-parse", "HEAD")).toBe(head)
  expect(git("tag", "--list")).toBe("")
  expect(check({ GITHUB_REF_NAME: "v0.1.0-alpha.0" }).status).toBe(0)
})

it.each([
  ["0.1.0-alpha.0", "alpha"],
  ["0.1.0-alpha.12", "alpha"],
  ["0.1.0-beta.0", "beta"],
  ["0.1.0-beta.12", "beta"],
  ["0.1.0", "latest"],
])("selects npm tag %s → %s only after validating the release", (version, npmTag) => {
  const { dir, pkg, save, check } = fixture()
  pkg.version = version
  save()
  writeFileSync(path.join(dir, "CHANGELOG.md"), `# Changelog\n\n## v${version}\n\nRelease notes.\n`)
  const output = path.join(dir, "github-output")
  writeFileSync(output, "existing=value\n")
  const result = check({ GITHUB_REF_NAME: `v${version}` })
  expect(result.status, result.stderr).toBe(0)
  expect(readFileSync(output, "utf8")).toBe(`existing=value\nnpm_tag=${npmTag}\n`)
})

it("prepares successive alpha, beta, and stable releases with explicit versions", () => {
  const { dir, git, prepare } = fixture()
  for (const version of ["0.1.0-alpha.0", "0.1.0-alpha.1", "0.1.0-beta.0", "0.1.0"]) {
    const head = git("rev-parse", "HEAD")
    const tags = git("tag", "--list")
    const result = prepare("-r", version)
    expect(result.status, result.stderr).toBe(0)
    expect(
      JSON.parse(readFileSync(path.join(dir, "packages/selfix/package.json"), "utf8")).version,
    ).toBe(version)
    expect(readFileSync(path.join(dir, "CHANGELOG.md"), "utf8")).toContain(`## v${version}`)
    expect(git("rev-parse", "HEAD")).toBe(head)
    expect(git("tag", "--list")).toBe(tags)
    git("add", ".")
    git("commit", "-m", `chore(release): v${version}`)
    git("tag", "-a", `v${version}`, "-m", `v${version}`)
    writeFileSync(path.join(dir, "fix.txt"), version)
    git("add", ".")
    git("commit", "-m", `fix: improve ${version}`)
  }
}, 15_000)

it("uses the validated npm tag for both dry-run and trusted publication", () => {
  const publishes = workflow.split("\n").filter((line) => line.includes("npm publish "))
  expect(publishes).toHaveLength(2)
  for (const publish of publishes) expect(publish).toContain('--tag "$NPM_TAG"')
  expect(workflow).toContain("npm_tag: ${{ steps.release.outputs.npm_tag }}")
  expect(workflow).toContain("NPM_TAG: ${{ steps.release.outputs.npm_tag }}")
  expect(workflow).toContain("NPM_TAG: ${{ needs.check.outputs.npm_tag }}")
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
  const { dir, check } = fixture()
  const result = check(env)
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain(message)
  expect(existsSync(path.join(dir, "github-output"))).toBe(false)
})

it.each([
  ["name", "other-package", "Only the selfix package"],
  ["private", true, "must not be private"],
  ["version", "0.1.0-rc.1", "Only stable"],
  ["version", "0.1.0-beta", "Only stable"],
  ["version", "0.1.0-beta.01", "Only stable"],
  ["version", "0.1.0-beta.-1", "Only stable"],
  ["version", "0.1.0-beta.0.extra", "Only stable"],
  ["version", "0.1.0-alpha.0+build", "Only stable"],
  ["version", "0.1.0-beta.0+build", "Only stable"],
  ["version", "01.1.0", "Only stable"],
  ["version", "0.1.0-alpha", "Only stable"],
  ["version", "0.1.0-alpha.01", "Only stable"],
  ["version", "0.1.0-alpha.-1", "Only stable"],
  ["version", "0.1.0-alpha.0.extra", "Only stable"],
  ["version", "0.1.0+build", "Only stable"],
] as const)("rejects invalid package metadata: %s = %s", (key, value, message) => {
  const { dir, pkg, save, check } = fixture()
  pkg[key] = value
  save()
  const result = check()
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain(message)
  expect(existsSync(path.join(dir, "github-output"))).toBe(false)
})

it.each(["\n", "\r\n"])(
  "extracts only the tagged version's notes with %j line endings",
  (newline) => {
    const { dir, check } = fixture()
    writeFileSync(
      path.join(dir, "CHANGELOG.md"),
      [
        "# Changelog",
        "",
        "## v0.2.0",
        "",
        "Newer release.",
        "",
        "## v0.1.0",
        "",
        "Release summary.",
        "",
        "### Fixes",
        "",
        "- Fixed a bug.",
        "",
        "  ## v0.0.1",
        "",
        "Older release.",
        "",
      ].join(newline),
    )
    const result = check()
    expect(result.status, result.stderr).toBe(0)
    expect(readFileSync(path.join(dir, "release-notes.md"), "utf8")).toBe(
      "Release summary.\n\n### Fixes\n\n- Fixed a bug.\n",
    )
  },
)

it.each([
  "## v0.1.0\n\n",
  "## v0.1.0\n\n## v0.0.1\n\nOlder release.\n",
  "## v0.1.0\n\nFirst entry.\n\n## v0.1.0\n\nDuplicate.\n",
])("rejects empty or duplicate release notes", (changelog) => {
  const { dir, check } = fixture()
  writeFileSync(path.join(dir, "CHANGELOG.md"), changelog)
  const result = check()
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("Prepare CHANGELOG.md")
  expect(existsSync(path.join(dir, "release-notes.md"))).toBe(false)
  expect(existsSync(path.join(dir, "github-output"))).toBe(false)
})

it.each([
  ["alpha", false],
  ["beta", false],
  ["latest", false],
  ["alpha", true],
  ["unknown", false],
])("creates GitHub releases safely for %s (existing: %s)", (channel, existing) => {
  const { dir } = fixture()
  const script = workflow
    .match(/- name: Create GitHub release[\s\S]*?run: \|\n((?: {10}[^\n]*\n?)+)/)?.[1]
    .replace(/^ {10}/gm, "")
  expect(script).toBeTruthy()
  const argsFile = path.join(dir, "gh-args")
  // Run the actual workflow shell, replacing gh with a local recording function.
  const result = spawnSync(
    "bash",
    [
      "-e",
      "-c",
      `
    gh() {
      if [ "$1 $2" = "release view" ]; then return ${existing ? 0 : 1}; fi
      printf '%s\\n' "$@" > "$GH_ARGS"
    }
    ${script}
  `,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GH_TOKEN: "",
        GH_ARGS: argsFile,
        NPM_TAG: channel,
        RELEASE_TAG: "v0.1.0-alpha.0",
        RUNNER_TEMP: dir,
      },
    },
  )
  expect(result.status, result.stderr).toBe(channel === "unknown" ? 1 : 0)
  if (existing || channel === "unknown") {
    expect(existsSync(argsFile)).toBe(false)
  } else {
    const args = readFileSync(argsFile, "utf8").trim().split("\n")
    expect(args).toEqual([
      "release",
      "create",
      "v0.1.0-alpha.0",
      "--verify-tag",
      "--title",
      "v0.1.0-alpha.0",
      "--notes-file",
      path.join(dir, "selfix-package/release-notes.md"),
      ...(channel === "latest" ? ["--latest"] : ["--prerelease", "--latest=false"]),
    ])
  }
})

it("requires changelog notes for the tagged version", () => {
  const { dir, check } = fixture()
  const output = path.join(dir, "github-output")
  writeFileSync(output, "")
  writeFileSync(path.join(dir, "CHANGELOG.md"), "# Changelog\n\n## v0.0.1\n")
  const result = check()
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("Prepare CHANGELOG.md")
  expect(readFileSync(output, "utf8")).toBe("")
})
