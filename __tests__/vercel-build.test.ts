import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * vercel-build.sh must name the right failure when a preview build dies.
 *
 * It previously mapped exit 137 to "Build ran out of memory" unconditionally.
 * That is wrong for the failure previews actually hit: `timeout -k` reports 124
 * only when the build dies to its SIGTERM, and 137 when the build ignores
 * SIGTERM and has to be SIGKILLed after the grace period — indistinguishable by
 * exit code from a kernel OOM kill. Previews that had simply run past
 * BUILD_TIMEOUT_SECONDS on an undersized build machine were therefore reported
 * as memory exhaustion, which sent an investigation after a ceiling that was
 * never the problem.
 *
 * These tests drive the real script against a stub `pnpm` that reproduces each
 * way a build can end, with the timeouts shrunk so they are reachable in
 * seconds.
 */

const TEST_TIMEOUT_SECONDS = 1;
const TEST_KILL_GRACE_SECONDS = 1;

type BuildMode = "ok" | "fail" | "hang_term" | "hang_kill" | "oom";

let workdir: string;

/**
 * A pnpm whose `build` ends the way `mode` asks it to.
 *
 * The sleeps detach from stdout: SIGKILL leaves them orphaned, and an orphan
 * still holding the inherited pipe keeps spawnSync blocked long after the
 * script it was measuring has exited.
 */
const STUB_PNPM = `#!/bin/bash
case "$MODE" in
  ok)        exit 0 ;;
  fail)      echo "compile error"; exit 1 ;;
  hang_term) sleep 60 >/dev/null 2>&1 ;;
  hang_kill) trap '' TERM; sleep 60 >/dev/null 2>&1 ;;
  oom)       kill -9 $$ ;;
esac
`;

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), "vercel-build-"));

  const bin = join(workdir, "bin");
  spawnSync("mkdir", ["-p", bin]);
  const pnpm = join(bin, "pnpm");
  writeFileSync(pnpm, STUB_PNPM);
  chmodSync(pnpm, 0o755);

  const script = readFileSync(join(__dirname, "..", "vercel-build.sh"), "utf8")
    .replace(/^BUILD_TIMEOUT_SECONDS=\d+$/m, `BUILD_TIMEOUT_SECONDS=${TEST_TIMEOUT_SECONDS}`)
    .replace(/^KILL_GRACE_SECONDS=\d+$/m, `KILL_GRACE_SECONDS=${TEST_KILL_GRACE_SECONDS}`);
  writeFileSync(join(workdir, "vercel-build.sh"), script);
});

afterAll(() => {
  rmSync(workdir, { recursive: true, force: true });
});

function runBuild(mode: BuildMode) {
  const result = spawnSync("bash", ["vercel-build.sh"], {
    cwd: workdir,
    encoding: "utf8",
    env: { ...process.env, MODE: mode, PATH: `${join(workdir, "bin")}:${process.env.PATH}` },
  });
  return { status: result.status, stdout: result.stdout };
}

/** The seconds the script reports it spent building, from either message. */
function elapsedFrom(stdout: string): number {
  const match = stdout.match(/(\d+)s elapsed|killed after (\d+)s/);
  return Number(match?.[1] ?? match?.[2]);
}

describe("vercel-build.sh", () => {
  it("exits clean without retrying when the build succeeds", () => {
    const { status, stdout } = runBuild("ok");

    expect(status).toBe(0);
    expect(stdout).not.toContain("Retrying");
  });

  it("reports a timeout, not memory, when the build is SIGKILLed past the deadline", () => {
    // The production failure: exit 137, but from timeout's own kill escalation.
    const { status, stdout } = runBuild("hang_kill");

    expect(status).toBe(137);
    expect(stdout).toContain("timed out");
    expect(stdout).not.toContain("out of memory");
    expect(stdout).toContain("Not retrying");
    // Elapsed time is the only thing separating this from a real OOM kill, so
    // pin that the script measured it rather than happening to land right.
    expect(elapsedFrom(stdout)).toBeGreaterThanOrEqual(TEST_TIMEOUT_SECONDS);
  });

  it("reports a timeout when the build dies to timeout's SIGTERM", () => {
    const { status, stdout } = runBuild("hang_term");

    expect(status).toBe(124);
    expect(stdout).toContain("timed out");
    expect(stdout).not.toContain("out of memory");
    expect(stdout).toContain("Not retrying");
  });

  it("still reports memory when the build is killed well short of the deadline", () => {
    const { status, stdout } = runBuild("oom");

    expect(status).toBe(137);
    expect(stdout).toContain("out of memory");
    expect(stdout).toContain("Not retrying");
    expect(elapsedFrom(stdout)).toBeLessThan(TEST_TIMEOUT_SECONDS);
  });

  it("retries once on an ordinary build failure, which a poisoned cache can survive", () => {
    const { status, stdout } = runBuild("fail");

    expect(status).toBe(1);
    expect(stdout).toContain("Retrying once with a clean .next cache");
    expect(stdout.match(/compile error/g)).toHaveLength(2);
  });

  it("records the build machine, since its size decides whether the build fits", () => {
    const { stdout } = runBuild("ok");

    expect(stdout).toMatch(/Build machine: \S+ cores, \S+ GB/);
  });
});
