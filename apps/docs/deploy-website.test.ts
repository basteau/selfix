import { spawnSync } from "node:child_process"
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"

const root = fileURLToPath(new URL("../../", import.meta.url))
test.each(["-oProxyCommand=bad", "host.example.com", "vm.exe.xyz; echo bad"])(
  "rejects unsafe deployment target %s before invoking SSH",
  (host) => {
    const result = spawnSync("bash", ["scripts/deploy-website.sh"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        EXE_HOST: host,
        EXE_SSH_KEY: "test",
        EXE_KNOWN_HOSTS: "test",
        GITHUB_SHA: "a".repeat(40),
      },
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Invalid exe.dev SSH target")
  },
)
test("rejects a malformed commit before invoking SSH", () => {
  const result = spawnSync("bash", ["scripts/deploy-website.sh"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      EXE_HOST: "site.exe.xyz",
      EXE_SSH_KEY: "test",
      EXE_KNOWN_HOSTS: "test",
      GITHUB_SHA: "main",
    },
  })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("Invalid commit SHA")
})

test("repeated deployments preserve the live release and its rollback target", () => {
  const directory = mkdtempSync(join(tmpdir(), "selfix-deploy-"))
  try {
    const script = readFileSync(join(root, "scripts/deploy-website.sh"), "utf8")
      .split("<<'REMOTE'\n")[1]!
      .split("\nREMOTE")[0]!
      .replaceAll("$HOME", directory)
    const bin = join(directory, "bin")
    mkdirSync(bin)
    // The production VM uses GNU mv; emulate its atomic rename on macOS too.
    writeFileSync(
      join(bin, "mv"),
      `#!${process.execPath}\nrequire('node:fs').renameSync(process.argv.at(-2), process.argv.at(-1))\n`,
    )
    chmodSync(join(bin, "mv"), 0o755)
    const source = join(directory, "source")
    mkdirSync(join(source, ".well-known"), { recursive: true })
    mkdirSync(join(source, "docs/getting-started"), { recursive: true })
    for (const page of ["index.html", "docs/index.html", "docs/getting-started/index.html"]) {
      writeFileSync(join(source, page), "site")
    }
    const deploy = (sha: string) => {
      writeFileSync(join(source, ".well-known/selfix-release.txt"), sha)
      const archive = spawnSync("tar", [
        "-czf",
        join(directory, `site-upload-${sha}.tgz`),
        "-C",
        source,
        ".",
      ])
      expect(archive.status).toBe(0)
      return spawnSync("bash", ["-s", "--", sha], {
        input: script,
        encoding: "utf8",
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      })
    }
    const current = join(directory, "selfix-site/current")
    const previous = join(directory, "selfix-site/previous")
    expect(deploy("a".repeat(40)).status).toBe(0)
    expect(statSync(current).mode & 0o777).toBe(0o755)
    const first = readlinkSync(current)
    expect(deploy("b".repeat(40)).status).toBe(0)
    const second = readlinkSync(current)
    expect(readlinkSync(previous)).toBe(first)
    writeFileSync(join(source, "index.html"), "must not overwrite the live release")
    expect(deploy("b".repeat(40)).status).toBe(0)
    expect(readlinkSync(current)).toBe(second)
    expect(readlinkSync(previous)).toBe(first)
    expect(readFileSync(join(current, "index.html"), "utf8")).toBe("site")

    rmSync(join(source, "docs/index.html"))
    expect(deploy("c".repeat(40)).status).not.toBe(0)
    expect(readlinkSync(current)).toBe(second)
    expect(readlinkSync(previous)).toBe(first)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

function workflowStep(name: string) {
  const workflow = readFileSync(join(root, ".github/workflows/website.yml"), "utf8")
  return workflow
    .split(`- name: ${name}\n`)[1]!
    .split("run: |\n")[1]!
    .split(/\n(?= {0,8}\S)/)[0]!
    .replaceAll(/^ {10}/gm, "")
}

test.each(["EXE_SSH_KEY", "EXE_HOST", "EXE_KNOWN_HOSTS"])(
  "website preflight fails when %s is unavailable",
  (missing) => {
    const result = spawnSync("bash", ["-e", "-c", workflowStep("Check deployment credentials")], {
      encoding: "utf8",
      env: {
        ...process.env,
        EXE_SSH_KEY: "test",
        EXE_HOST: "site.exe.xyz",
        EXE_KNOWN_HOSTS: "test",
        [missing]: "",
      },
    })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(`Set ${missing} in the website environment`)
  },
)

test("website preflight accepts only release tags whose commits are on main", () => {
  const directory = mkdtempSync(join(tmpdir(), "selfix-website-ref-"))
  try {
    const git = (...args: string[]) => {
      const result = spawnSync("git", args, { cwd: directory, encoding: "utf8" })
      expect(result.status, result.stderr).toBe(0)
      return result.stdout.trim()
    }
    git("init", "--initial-branch=main")
    git("config", "user.name", "Website test")
    git("config", "user.email", "website@example.com")
    git("-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "initial")
    const release = git("rev-parse", "HEAD")
    git("-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "later main commit")
    git("update-ref", "refs/remotes/origin/main", "HEAD")
    git("checkout", "--detach", release)
    const check = (ref: string) =>
      spawnSync("bash", ["-e", "-c", workflowStep("Verify release tag is on main")], {
        cwd: directory,
        encoding: "utf8",
        env: { ...process.env, GITHUB_REF: ref },
      })
    expect(check("refs/tags/v1.0.0").status).toBe(0)
    expect(check("refs/tags/v1.0.1-beta.0").status).toBe(0)
    expect(check("refs/heads/main").stderr).toContain("requires a v* tag")
    expect(check("refs/tags/other").status).not.toBe(0)
    git("-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "off main")
    const rejected = check("refs/tags/v1.0.0")
    expect(rejected.status).not.toBe(0)
    expect(rejected.stderr).toContain("release commit must be on main")
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
