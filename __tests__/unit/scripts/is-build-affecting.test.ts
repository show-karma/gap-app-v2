import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * scripts/ci/is-build-affecting.sh decides whether a change can affect the
 * build, and vercel-ignore.sh turns that into Vercel's skip/build answer. The
 * next deploy pipeline reuses the first, so both are driven here against real
 * throwaway git repositories rather than a reimplementation of the path list.
 */

const APP_ROOT = join(__dirname, "..", "..", "..");
const SCRIPT = join(APP_ROOT, "scripts", "ci", "is-build-affecting.sh");
const VERCEL_IGNORE = join(APP_ROOT, "vercel-ignore.sh");

const BUILD = 0;
const SKIP = 10;

// Fixture commits only: a CI runner may have no git identity configured.
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "fixture",
  GIT_AUTHOR_EMAIL: "fixture@example.invalid",
  GIT_COMMITTER_NAME: "fixture",
  GIT_COMMITTER_EMAIL: "fixture@example.invalid",
};

const workdirs: string[] = [];

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function writeFiles(root: string, paths: readonly string[]) {
  for (const path of paths) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, `${path}\n${Math.random()}\n`);
  }
}

/** A repo with a base commit and a head commit that changes `changed`. */
function repoWithChange(changed: readonly string[]) {
  const dir = mkdtempSync(join(tmpdir(), "is-build-affecting-"));
  workdirs.push(dir);
  git(dir, "init", "-q");
  writeFiles(dir, ["package.json"]);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  const base = git(dir, "rev-parse", "HEAD");
  writeFiles(dir, changed);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--allow-empty", "-m", "head");
  const head = git(dir, "rev-parse", "HEAD");
  return { dir, base, head };
}

function run(script: string, cwd: string, args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync("bash", [script, ...args], {
    cwd,
    env: { ...GIT_ENV, ...env },
    encoding: "utf8",
  });
}

afterAll(() => {
  for (const dir of workdirs) rmSync(dir, { recursive: true, force: true });
});

describe("scripts/ci/is-build-affecting.sh", () => {
  it.each([
    ["docs/guide.md"],
    ["docs/diagrams/flow.png"],
    [".github/workflows/ci.yml"],
    [".claude/settings.json"],
    [".agents/notes.txt"],
    ["__tests__/unit/foo.test.ts"],
    ["__tests__/fixtures/data.json"],
    ["e2e/specs/home.ts"],
    ["components/Foo.test.tsx"],
    ["src/features/x/bar.spec.ts"],
    ["README.md"],
    ["src/features/x/NOTES.md"],
    ["docs/a file with spaces.md"],
  ])("skips a change that only touches %s", (path) => {
    const { dir, base, head } = repoWithChange([path]);
    expect(run(SCRIPT, dir, [base, head]).status).toBe(SKIP);
  });

  it("skips a change made only of several inert paths", () => {
    const { dir, base, head } = repoWithChange([
      "docs/a.md",
      "__tests__/a.test.ts",
      ".github/workflows/a.yml",
      "e2e/a.ts",
    ]);
    expect(run(SCRIPT, dir, [base, head]).status).toBe(SKIP);
  });

  it.each([
    ["components/Foo.tsx"],
    ["app/page.tsx"],
    ["next.config.ts"],
    ["package.json"],
    ["vercel.json"],
    ["scripts/ci/is-build-affecting.sh"],
    // public/ is served verbatim, markdown included.
    ["public/pricing.md"],
    ["public/agents.md"],
    // Lookalikes of the inert directories are not inert.
    ["docsx/page.tsx"],
    ["src/docs/page.tsx"],
    ["src/__tests__helpers.ts"],
  ])("builds when the change touches %s", (path) => {
    const { dir, base, head } = repoWithChange([path]);
    const result = run(SCRIPT, dir, [base, head]);
    expect(result.status).toBe(BUILD);
    expect(result.stdout).toContain("Build-affecting change detected");
  });

  it("builds when one build-affecting path hides among inert ones", () => {
    const { dir, base, head } = repoWithChange(["docs/a.md", "utilities/x.ts", "e2e/a.ts"]);
    expect(run(SCRIPT, dir, [base, head]).status).toBe(BUILD);
  });

  describe("fails open", () => {
    it.each([
      ["no arguments", []],
      ["only one SHA", ["abc"]],
      ["empty SHAs", ["", ""]],
    ])("builds with %s", (_, args) => {
      const { dir } = repoWithChange(["docs/a.md"]);
      expect(run(SCRIPT, dir, args as string[]).status).toBe(BUILD);
    });

    it("builds when the base SHA is unreachable (shallow clone)", () => {
      const { dir, head } = repoWithChange(["docs/a.md"]);
      const missing = "0123456789abcdef0123456789abcdef01234567";
      expect(run(SCRIPT, dir, [missing, head]).status).toBe(BUILD);
    });

    it("builds when the head SHA is unreachable", () => {
      const { dir, base } = repoWithChange(["docs/a.md"]);
      const missing = "0123456789abcdef0123456789abcdef01234567";
      expect(run(SCRIPT, dir, [base, missing]).status).toBe(BUILD);
    });

    it("builds when there is no diff to judge", () => {
      const { dir, head } = repoWithChange(["docs/a.md"]);
      expect(run(SCRIPT, dir, [head, head]).status).toBe(BUILD);
    });

    it("builds outside a git repository", () => {
      const dir = mkdtempSync(join(tmpdir(), "is-build-affecting-nogit-"));
      workdirs.push(dir);
      expect(run(SCRIPT, dir, ["a", "b"]).status).toBe(BUILD);
    });
  });
});

describe("vercel-ignore.sh (exit 0 = skip, 1 = build)", () => {
  const vercelEnv = (base: string, head: string, ref = "feat/x") => ({
    VERCEL_GIT_COMMIT_REF: ref,
    VERCEL_GIT_PREVIOUS_SHA: base,
    VERCEL_GIT_COMMIT_SHA: head,
  });

  it("skips every push to main, whatever it touches", () => {
    const { dir, base, head } = repoWithChange(["components/Foo.tsx"]);
    expect(run(VERCEL_IGNORE, dir, [], vercelEnv(base, head, "main")).status).toBe(0);
  });

  it("skips a branch push that only touches inert paths", () => {
    const { dir, base, head } = repoWithChange(["docs/a.md", "__tests__/a.test.ts"]);
    expect(run(VERCEL_IGNORE, dir, [], vercelEnv(base, head)).status).toBe(0);
  });

  it("builds a branch push that touches the app", () => {
    const { dir, base, head } = repoWithChange(["components/Foo.tsx"]);
    expect(run(VERCEL_IGNORE, dir, [], vercelEnv(base, head)).status).toBe(1);
  });

  it("builds when Vercel provides no previous SHA (first push of a branch)", () => {
    const { dir, head } = repoWithChange(["docs/a.md"]);
    expect(run(VERCEL_IGNORE, dir, [], vercelEnv("", head)).status).toBe(1);
  });

  it("builds when the shared script is missing, rather than skipping", () => {
    // A copy of vercel-ignore.sh with no scripts/ci next to it: bash exits 127,
    // which must read as "build", never as "inert".
    const { dir, base, head } = repoWithChange(["docs/a.md"]);
    const isolated = join(dir, "isolated-vercel-ignore.sh");
    copyFileSync(VERCEL_IGNORE, isolated);
    expect(run(isolated, dir, [], vercelEnv(base, head)).status).toBe(1);
  });
});
