import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { designCheck, type Finding, RULES, SCRIPT } from "./helpers/design-check-harness";

// ── CLI modes (real git repository) ─────────────────────────────────────────

// Every case builds the exact repository state it asserts. A shared beforeAll
// made cases cumulative — the three-dot test relied on a commit the previous
// test happened to make, so running it alone proved nothing (Rival R8).
describe("CLI modes", () => {
  let repo: string;
  let baseSha: string;

  const run = (args: string[]) => {
    try {
      const stdout = execFileSync(process.execPath, [SCRIPT, "--root", repo, ...args], {
        cwd: repo,
        encoding: "utf8",
      });
      return { status: 0, stdout };
    } catch (err) {
      const e = err as { status: number; stdout: string; stderr: string };
      return { status: e.status, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
    }
  };

  const runJson = (args: string[]) => {
    const res = run([...args, "--json"]);
    return { status: res.status, json: JSON.parse(res.stdout) };
  };

  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();

  const write = (rel: string, body: string) => {
    const abs = path.join(repo, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  };

  const commit = (message: string) => {
    git("add", "-A");
    git("-c", "core.hooksPath=/dev/null", "commit", "-qm", message);
    return git("rev-parse", "HEAD");
  };

  /** Two legacy DS001 findings that must never block a PR that leaves them alone. */
  const LEGACY = [
    "export const Legacy = () => (",
    '  <span className="bg-[#111111]">a</span>',
    '  <span className="bg-[#222222]">b</span>',
    ");",
    "",
  ].join("\n");

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "design-check-"));
    git("init", "-q", "-b", "main");
    git("config", "user.email", "dev@example.com");
    git("config", "user.name", "Dev");
    write("components/Legacy.tsx", LEGACY);
    baseSha = commit("seed");
  });

  afterEach(() => {
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("full mode reports the whole repository and exits 1 on errors", () => {
    const { status, json } = runJson([]);
    expect(status).toBe(1);
    expect(json.mode).toBe("full");
    expect(json.summary.byRule.DS001).toBe(2);
  });

  it("--report never exits non-zero", () => {
    const { status, json } = runJson(["--report"]);
    expect(status).toBe(0);
    expect(json.summary.error).toBe(2);
  });

  it("--changed ignores legacy debt in an untouched region", () => {
    write(
      "components/Clean.tsx",
      'export const Clean = () => <span className="bg-brand">ok</span>;\n'
    );
    commit("clean");
    const { status, json } = runJson(["--changed", "--base", baseSha]);
    expect(status).toBe(0);
    expect(json.findings).toEqual([]);
  });

  it("--changed blocks on a violation on an added line", () => {
    write(
      "components/Dirty.tsx",
      'export const Dirty = () => <span className="bg-[#123456]">no</span>;\n'
    );
    commit("dirty");
    const { status, json } = runJson(["--changed", "--base", baseSha]);
    expect(status).toBe(1);
    expect(json.summary.byRule.DS001).toBe(1);
    expect(json.findings[0].file).toBe("components/Dirty.tsx");
  });

  it("--changed uses a three-dot diff so an advanced base is ignored", () => {
    // This branch's own change.
    write(
      "components/Dirty.tsx",
      'export const Dirty = () => <span className="bg-[#123456]">no</span>;\n'
    );
    const head = commit("dirty");

    // The base branch advances with an unrelated violating commit.
    git("checkout", "-q", "-b", "other", baseSha);
    write("components/Unrelated.tsx", 'export const U = () => <b className="bg-[#999999]" />;\n');
    const advanced = commit("unrelated");
    git("checkout", "-q", "main");
    expect(git("rev-parse", "HEAD")).toBe(head);

    const { json } = runJson(["--changed", "--base", advanced]);
    expect(json.findings.map((f: Finding) => f.file)).toEqual(["components/Dirty.tsx"]);
  });

  it("exits 2 when the base cannot be resolved", () => {
    const res = run(["--changed", "--base", "0000000000000000000000000000000000000000"]);
    expect(res.status).toBe(2);
  });

  it("exits 2 when --changed is given no base", () => {
    expect(run(["--changed"]).status).toBe(2);
  });

  it("exits 2 when there is no merge base with the given commit", () => {
    const orphan = execFileSync(
      "git",
      ["-C", repo, "commit-tree", "-m", "orphan", `${baseSha}^{tree}`],
      { encoding: "utf8" }
    ).trim();
    expect(run(["--changed", "--base", orphan]).status).toBe(2);
  });

  it("--staged only looks at the index", () => {
    write("components/Staged.tsx", 'export const S = () => <b className="bg-[#abcdef]" />;\n');
    git("add", "components/Staged.tsx");
    write("components/Unstaged.tsx", 'export const U = () => <b className="bg-[#fedcba]" />;\n');
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.findings.map((f: Finding) => f.file)).toEqual(["components/Staged.tsx"]);
  });

  it("--staged covers stylesheets, not just TypeScript", () => {
    write("styles/staged.scss", ".x { color: #123456; }\n");
    git("add", "styles/staged.scss");
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.summary.byRule.DS007).toBe(1);
  });

  // D1: `git diff --cached` compares HEAD to the index, so the content that
  // its line numbers refer to is the index blob — not the working copy the
  // developer keeps editing after `git add`.
  it("--staged blocks a staged violation even when the worktree already fixes it", () => {
    write("components/Drift.tsx", 'export const D = () => <b className="bg-[#BADBAD]" />;\n');
    git("add", "components/Drift.tsx");
    write("components/Drift.tsx", 'export const D = () => <b className="bg-brand" />;\n');
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.findings.map((f: Finding) => f.rule)).toEqual(["DS001"]);
  });

  it("--staged passes a clean staged change even when the worktree is dirty", () => {
    write("components/Clean2.tsx", 'export const C = () => <b className="bg-brand" />;\n');
    git("add", "components/Clean2.tsx");
    write("components/Clean2.tsx", 'export const C = () => <b className="bg-[#DEAD00]" />;\n');
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(0);
    expect(json.findings).toEqual([]);
  });

  it("--staged applies index line numbers to index content after an insertion", () => {
    write(
      "components/Shift.tsx",
      ["export const S = () => (", '  <b className="bg-[#C0FFEE]" />', ");", ""].join("\n")
    );
    git("add", "components/Shift.tsx");
    write(
      "components/Shift.tsx",
      [
        "// an unstaged comment pushes everything down",
        "export const S = () => (",
        '  <b className="bg-[#C0FFEE]" />',
        ");",
        "",
      ].join("\n")
    );
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.findings).toHaveLength(1);
    expect(json.findings[0].line).toBe(2);
  });

  it("--staged treats a staged new file as fully added", () => {
    write("components/Fresh.tsx", 'export const F = () => <b className="bg-[#0FF1CE]" />;\n');
    git("add", "components/Fresh.tsx");
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.findings.map((f: Finding) => f.file)).toEqual(["components/Fresh.tsx"]);
  });

  it("--changed reads content from HEAD, not from a dirty worktree", () => {
    write("components/Legacy.tsx", 'export const L = () => <b className="bg-[#FADED0]" />;\n');
    const { json } = runJson(["--changed", "--base", baseSha]);
    expect(json.findings).toEqual([]);
  });

  it("--worktree treats an untracked file as fully added", () => {
    write("components/Unstaged.tsx", 'export const U = () => <b className="bg-[#fedcba]" />;\n');
    const { status, json } = runJson(["--worktree", "components/Unstaged.tsx"]);
    expect(status).toBe(1);
    expect(json.findings.map((f: Finding) => f.rule)).toEqual(["DS001"]);
  });

  it("--worktree ignores untouched legacy debt", () => {
    const { status, json } = runJson(["--worktree", "components/Legacy.tsx"]);
    expect(status).toBe(0);
    expect(json.findings).toEqual([]);
  });

  it("--worktree accepts an absolute Windows-style path", () => {
    write("components/Unstaged.tsx", 'export const U = () => <b className="bg-[#fedcba]" />;\n');
    const abs = path.join(repo, "components", "Unstaged.tsx");
    const { json } = runJson(["--worktree", abs]);
    expect(json.findings).toHaveLength(1);
  });

  it("--files scans whole files but never blocks", () => {
    const { status, json } = runJson(["--files", "components/Legacy.tsx"]);
    expect(status).toBe(0);
    expect(json.mode).toBe("files");
    expect(json.summary.byRule.DS001).toBe(2);
  });

  it("emits the documented JSON envelope", () => {
    const { json } = runJson(["--report"]);
    expect(Object.keys(json).sort()).toEqual(["base", "findings", "mode", "summary", "waivers"]);
    expect(Object.keys(json.summary).sort()).toEqual(["byRule", "error", "waived", "warn"]);
  });

  // Rival R6b: the workflow validates added waivers against the PR body. It
  // must never read them out of `findings`, which is capped for display.
  it("lists every waiver in an uncapped waivers array, past the display cap", () => {
    const lines: string[] = [];
    for (let i = 0; i < 501; i++) {
      lines.push(
        `// design-check-ignore: DS001 tenant swatch number ${i} supplied by the customer`
      );
      lines.push(`const w${i} = "bg-[#${(i % 0x1000000).toString(16).padStart(6, "0")}]";`);
    }
    write("components/ManyWaivers.tsx", `${lines.join("\n")}\n`);
    git("add", "components/ManyWaivers.tsx");

    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(0);
    expect(json.summary.waived).toBe(501);
    // Display is capped; the waiver list is not.
    expect(json.findings.length).toBe(500);
    expect(json.truncated).toBe(1);
    expect(json.waivers).toHaveLength(501);
    expect(json.waivers.every((w: Finding) => w.waived)).toBe(true);
    expect(json.waivers.every((w: Finding) => w.waiverAdded)).toBe(true);
    // The 501st waiver — the one truncation dropped from `findings`.
    const shown = new Set(
      json.findings.filter((f: Finding) => f.waived).map((f: Finding) => f.line)
    );
    const missing = json.waivers.filter((w: Finding) => !shown.has(w.line));
    expect(missing).toHaveLength(1);
    expect(missing[0].waiverRules).toBe("DS001");
    expect(missing[0].waiverReason).toMatch(/tenant swatch number/);
  });

  it("carries the fields the PR-body validator needs on every waiver", () => {
    write(
      "components/OneWaiver.tsx",
      [
        "// design-check-ignore: DS001 tenant supplied swatch, migration tracked in DEV-999",
        'export const W = () => <b className="bg-[#123456]" />;',
        "",
      ].join("\n")
    );
    git("add", "components/OneWaiver.tsx");
    const { json } = runJson(["--staged"]);
    expect(json.waivers).toHaveLength(1);
    expect(json.waivers[0]).toMatchObject({
      rule: "DS001",
      file: "components/OneWaiver.tsx",
      line: 2,
      waived: true,
      waiverAdded: true,
      waiverRules: "DS001",
    });
    expect(json.waivers[0].waiverReason).toBe(
      "tenant supplied swatch, migration tracked in DEV-999"
    );
  });

  it("emits an empty waivers array when nothing is waived", () => {
    const { json } = runJson(["--report"]);
    expect(json.waivers).toEqual([]);
  });

  it("prints a human table without --json", () => {
    const res = run(["--report"]);
    expect(res.stdout).toContain("DS001");
    expect(res.stdout).toContain("components/Legacy.tsx");
  });

  it("counts a waived finding under waived, not error", () => {
    write(
      "components/Waived.tsx",
      [
        "// design-check-ignore: DS001 tenant supplied swatch, migration tracked in DEV-999",
        'export const W = () => <b className="bg-[#123456]" />;',
        "",
      ].join("\n")
    );
    const { status, json } = runJson(["--worktree", "components/Waived.tsx"]);
    expect(status).toBe(0);
    expect(json.summary.error).toBe(0);
    expect(json.summary.waived).toBe(1);
  });

  // Rival R6: the per-file cap used to drop findings BEFORE the summary was
  // computed, so 500 leading warnings hid a later error and the run passed.
  it("still blocks when an error follows 500 warnings in one file", () => {
    const lines = Array.from({ length: 500 }, (_, i) => `const w${i} = "p-[${i + 3}px]";`);
    lines.push('const boom = "bg-[#123456]";');
    write("components/Many.tsx", `${lines.join("\n")}\n`);
    git("add", "components/Many.tsx");

    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.summary.error).toBe(1);
    expect(json.summary.warn).toBe(500);
    expect(json.summary.byRule.DS001).toBe(1);
    expect(json.summary.byRule.DS006).toBe(500);
  });

  it("caps the displayed list but reports how many were hidden", () => {
    const lines = Array.from({ length: 500 }, (_, i) => `const w${i} = "p-[${i + 3}px]";`);
    lines.push('const boom = "bg-[#123456]";');
    write("components/Many.tsx", `${lines.join("\n")}\n`);
    git("add", "components/Many.tsx");

    const { json } = runJson(["--staged"]);
    expect(json.findings).toHaveLength(500);
    expect(json.truncated).toBe(1);
    // The error survives truncation; a warning is dropped instead.
    expect(json.findings.some((f: Finding) => f.rule === "DS001")).toBe(true);
  });

  it("says in the human table how many findings were hidden", () => {
    const lines = Array.from({ length: 501 }, (_, i) => `const w${i} = "p-[${i + 3}px]";`);
    write("components/Many.tsx", `${lines.join("\n")}\n`);
    git("add", "components/Many.tsx");

    const res = run(["--staged", "--report"]);
    expect(res.stdout).toContain("1 finding(s) hidden");
    expect(res.stdout).toContain("501 warning(s)");
  });

  it("omits the truncated key when nothing was hidden", () => {
    const { json } = runJson(["--report"]);
    expect(json).not.toHaveProperty("truncated");
  });

  // A large report reaches the quality-gate collector through a PIPE. Exiting
  // with process.exit() right after writing discards whatever has not drained
  // on Linux, so the collector received truncated JSON while a file redirect
  // looked fine. Emit enough output to exceed a pipe buffer and parse it back.
  it("emits complete JSON through a pipe, not just to a file", () => {
    const lines = Array.from(
      { length: 400 },
      (_, i) => `const w${i} = "p-[${i + 3}px] bg-[#${(i % 4096).toString(16).padStart(6, "0")}]";`
    );
    write("components/Big.tsx", `${lines.join("\n")}\n`);
    git("add", "components/Big.tsx");

    const res = execFileSync(
      process.execPath,
      [SCRIPT, "--root", repo, "--staged", "--report", "--json"],
      { cwd: repo, encoding: "utf8", maxBuffer: 1024 * 1024 * 64 }
    );
    // Comfortably past a 64 KB pipe buffer.
    expect(res.length).toBeGreaterThan(200_000);
    const json = JSON.parse(res);
    expect(json.summary.byRule.DS001).toBe(400);
    expect(json.summary.byRule.DS006).toBe(400);
  });

  it("still reports the right exit code when stdout is a pipe", () => {
    write("components/Piped.tsx", 'export const P = () => <b className="bg-[#123456]" />;\n');
    git("add", "components/Piped.tsx");
    expect(run(["--staged"]).status).toBe(1);
    expect(run(["--staged", "--report"]).status).toBe(0);
    expect(run(["--changed"]).status).toBe(2);
  });

  it("fails closed on a source file above the size cap", () => {
    write("components/Huge.tsx", `const x = "${"a".repeat(2 * 1024 * 1024 + 10)}";\n`);
    git("add", "components/Huge.tsx");
    const res = run(["--staged"]);
    expect(res.status).toBe(2);
    expect(res.stderr).toContain("components/Huge.tsx");
  });
});

// The CLI-mode block above shells out, which proves the real exit codes but
// hides the CLI half from in-process coverage. `run()` returns the exit code
// instead of calling process.exit, so it can also be driven directly.
describe("run() in process", () => {
  let repo: string;

  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();

  const write = (rel: string, body: string) => {
    const abs = path.join(repo, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  };

  /** Runs the CLI in this process, capturing stdout. */
  const capture = (args: string[]) => {
    const chunks: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = designCheck.run(["--root", repo, ...args]);
      return { code, out: chunks.join("") };
    } finally {
      process.stdout.write = original;
    }
  };

  beforeAll(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "design-run-"));
    git("init", "-q", "-b", "main");
    git("config", "user.email", "dev@example.com");
    git("config", "user.name", "Dev");
    write(
      "components/Palette.tsx",
      [
        "export const Palette = () => (",
        '  <span className="bg-[#2ed1a8]">brand</span>',
        '  <span className="p-[13px]">scale</span>',
        ");",
        "",
      ].join("\n")
    );
    write("styles/theme.scss", ".a { color: #123456; }\n");
    git("add", "-A");
    git("commit", "-qm", "seed");
  });

  afterAll(() => {
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("prints the help text and exits 0", () => {
    const { code, out } = capture(["--help"]);
    expect(code).toBe(0);
    expect(out).toContain("Usage: node scripts/check-design-system.js");
    expect(out).toContain("--worktree");
  });

  it("renders a human table with the curated hint and exits 1", () => {
    const { code, out } = capture([]);
    expect(code).toBe(1);
    expect(out).toContain("components/Palette.tsx:2");
    expect(out).toContain("DS001");
    expect(out).toContain("→ bg-brand");
    expect(out).toContain("2 error(s), 1 warning(s), 0 waived");
  });

  it("says so plainly when a scan is clean", () => {
    const { code, out } = capture(["--files", "components/Nope.tsx"]);
    expect(code).toBe(0);
    expect(out).toContain("no design-system findings");
  });

  it("emits JSON when asked and never exits 1 under --report", () => {
    const { code, out } = capture(["--report", "--json"]);
    expect(code).toBe(0);
    const json = JSON.parse(out);
    expect(json.mode).toBe("full");
    expect(json.base).toBeNull();
    expect(json.summary.byRule).toEqual({ DS001: 1, DS006: 1, DS007: 1 });
  });

  it("throws rather than reporting zero when --changed has no base", () => {
    expect(() => capture(["--changed"])).toThrow(/--base/);
  });

  it("throws on an unknown option", () => {
    expect(() => capture(["--nope"])).toThrow(/unknown option/);
  });

  it("throws on a stray positional argument", () => {
    expect(() => capture(["oops.tsx"])).toThrow(/unexpected argument/);
  });

  it("accepts an explicit --config path", () => {
    const configPath = path.resolve(__dirname, "../../../scripts/design-check.config.json");
    const { code } = capture(["--report", "--json", "--config", configPath]);
    expect(code).toBe(0);
  });

  it("reports nothing for a tracked file with no local edits", () => {
    const { code, out } = capture(["--worktree", "components/Palette.tsx", "--json"]);
    expect(code).toBe(0);
    expect(JSON.parse(out).findings).toEqual([]);
  });

  it("reports the added lines of an edited tracked file", () => {
    write(
      "components/Palette.tsx",
      [
        "export const Palette = () => (",
        '  <span className="bg-[#2ed1a8]">brand</span>',
        '  <span className="p-[13px]">scale</span>',
        '  <span className="text-[#ff0000]">added</span>',
        ");",
        "",
      ].join("\n")
    );
    const { code, out } = capture(["--worktree", "components/Palette.tsx", "--json"]);
    expect(code).toBe(1);
    const json = JSON.parse(out);
    expect(json.findings).toHaveLength(1);
    expect(json.findings[0].line).toBe(4);
    git("checkout", "--", "components/Palette.tsx");
  });

  it("reports nothing staged when the index is clean", () => {
    const { code, out } = capture(["--staged", "--json"]);
    expect(code).toBe(0);
    expect(JSON.parse(out).findings).toEqual([]);
  });

  // D10: the untracked branch of --worktree had subprocess-only coverage.
  it("treats an untracked file as fully added", () => {
    write("components/Untracked.tsx", 'export const U = () => <b className="bg-[#BEEFED}" />;\n');
    write("components/Untracked.tsx", 'export const U = () => <b className="bg-[#BEEFED]" />;\n');
    const { code, out } = capture(["--worktree", "components/Untracked.tsx", "--json"]);
    expect(code).toBe(1);
    const json = JSON.parse(out);
    expect(json.findings).toHaveLength(1);
    expect(json.findings[0].line).toBe(1);
    fs.rmSync(path.join(repo, "components/Untracked.tsx"));
  });

  it("skips an untracked path that does not exist on disk", () => {
    const { code, out } = capture(["--worktree", "components/Ghost.tsx", "--json"]);
    expect(code).toBe(0);
    expect(JSON.parse(out).findings).toEqual([]);
  });

  it("reads --staged content from the index in process too", () => {
    write("components/Idx.tsx", 'export const I = () => <b className="bg-[#123456]" />;\n');
    git("add", "components/Idx.tsx");
    write("components/Idx.tsx", "export const I = () => null;\n");
    const { code, out } = capture(["--staged", "--json"]);
    expect(code).toBe(1);
    expect(JSON.parse(out).findings[0].file).toBe("components/Idx.tsx");
    git("reset", "-q");
    fs.rmSync(path.join(repo, "components/Idx.tsx"));
  });
});

describe("RULES table", () => {
  it("exposes every documented rule with its severity", () => {
    expect(Object.keys(RULES).sort()).toEqual([
      "DS000",
      "DS001",
      "DS002",
      "DS003",
      "DS004",
      "DS005",
      "DS006",
      "DS007",
    ]);
    expect(RULES.DS006.severity).toBe("warn");
    expect(RULES.DS005.severity).toBe("error");
  });
});
