import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * vercel-build.sh must stop at its ceiling and name the right failure.
 *
 * Two things it previously got wrong.
 *
 * It mapped exit 137 to "Build ran out of memory" unconditionally. That is
 * wrong for the failure previews actually hit: `timeout -k` reports 124 only
 * when the build dies to its SIGTERM, and 137 when the build ignores SIGTERM
 * and has to be SIGKILLed after the grace period — indistinguishable by exit
 * code from a kernel OOM kill. Builds that had simply run past the deadline
 * were reported as memory exhaustion, which sent an investigation after a
 * ceiling that was never the problem.
 *
 * And the ceiling did not bound anything, because a retry drew its own full
 * allowance on top of the attempt that had just exhausted one.
 *
 * These tests drive the real script against a stub `pnpm` that reproduces each
 * way a build can end, with the ceiling shrunk so they are reachable in seconds.
 */

const TEST_CEILING_SECONDS = 3;
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
echo "build attempt" >> "$ATTEMPT_LOG"
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
  mkdirSync(bin);
  const pnpm = join(bin, "pnpm");
  writeFileSync(pnpm, STUB_PNPM);
  chmodSync(pnpm, 0o755);

  const original = readFileSync(join(__dirname, "..", "vercel-build.sh"), "utf8");
  const script = original
    .replace(/^BUILD_CEILING_SECONDS=\d+$/m, `BUILD_CEILING_SECONDS=${TEST_CEILING_SECONDS}`)
    .replace(/^KILL_GRACE_SECONDS=\d+$/m, `KILL_GRACE_SECONDS=${TEST_KILL_GRACE_SECONDS}`);

  // A rename would make both replacements no-op, and the suite would silently
  // run against the real 8-minute ceiling — every timeout test hanging for
  // eight minutes, or passing for the wrong reason.
  if (!script.includes(`BUILD_CEILING_SECONDS=${TEST_CEILING_SECONDS}`)) {
    throw new Error("vercel-build.sh no longer declares BUILD_CEILING_SECONDS=<n>");
  }
  if (!script.includes(`KILL_GRACE_SECONDS=${TEST_KILL_GRACE_SECONDS}`)) {
    throw new Error("vercel-build.sh no longer declares KILL_GRACE_SECONDS=<n>");
  }

  writeFileSync(join(workdir, "vercel-build.sh"), script);
});

afterAll(() => {
  rmSync(workdir, { recursive: true, force: true });
});

let runCounter = 0;

function runBuild(mode: BuildMode) {
  // Per invocation, not per mode: the wall-clock test re-runs every mode, and a
  // shared log would let it inflate the attempt count another test asserts on.
  const attemptLog = join(workdir, `attempts-${mode}-${runCounter++}.log`);
  const startedAt = Date.now();
  const result = spawnSync("bash", ["vercel-build.sh"], {
    cwd: workdir,
    encoding: "utf8",
    env: {
      ...process.env,
      MODE: mode,
      ATTEMPT_LOG: attemptLog,
      PATH: `${join(workdir, "bin")}:${process.env.PATH}`,
    },
  });
  let attempts = 0;
  try {
    attempts = readFileSync(attemptLog, "utf8").trim().split("\n").length;
  } catch {
    // SUPPRESSED: the stub never ran, which the attempt count of 0 reports.
  }
  return {
    status: result.status,
    stdout: result.stdout,
    attempts,
    wallSeconds: (Date.now() - startedAt) / 1000,
  };
}

/** The seconds the script reports it spent building, from either message. */
function elapsedFrom(stdout: string): number {
  const match = stdout.match(/(\d+)s elapsed|killed after (\d+)s/);
  return Number(match?.[1] ?? match?.[2]);
}

describe("vercel-build.sh", () => {
  it("exits clean when the build succeeds", () => {
    const { status, attempts } = runBuild("ok");

    expect(status).toBe(0);
    expect(attempts).toBe(1);
  });

  it("reports the ceiling, not memory, when the build is SIGKILLed past the deadline", () => {
    // The production failure: exit 137, but from timeout's own kill escalation.
    const { status, stdout } = runBuild("hang_kill");

    expect(status).toBe(137);
    expect(stdout).toContain("ceiling");
    expect(stdout).not.toContain("out of memory");
    // Elapsed time is the only thing separating this from a real OOM kill, so
    // pin that the script measured it rather than happening to land right.
    expect(elapsedFrom(stdout)).toBeGreaterThanOrEqual(
      TEST_CEILING_SECONDS - TEST_KILL_GRACE_SECONDS
    );
  });

  it("reports the ceiling when the build dies to timeout's SIGTERM", () => {
    const { status, stdout } = runBuild("hang_term");

    expect(status).toBe(124);
    expect(stdout).toContain("ceiling");
    expect(stdout).not.toContain("out of memory");
  });

  it("still reports memory when the build is killed well short of the deadline", () => {
    const { status, stdout } = runBuild("oom");

    expect(status).toBe(137);
    expect(stdout).toContain("out of memory");
    expect(elapsedFrom(stdout)).toBeLessThan(TEST_CEILING_SECONDS - TEST_KILL_GRACE_SECONDS);
  });

  it("never runs the build more than once", () => {
    // A retry drew its own full allowance, which made the ceiling meaningless.
    const { status, stdout, attempts } = runBuild("fail");

    expect(status).toBe(1);
    expect(attempts).toBe(1);
    expect(stdout).not.toContain("Retrying");
  });

  it("never exceeds the ceiling, whichever way the build ends", () => {
    for (const mode of ["ok", "fail", "hang_term", "hang_kill", "oom"] as const) {
      expect(runBuild(mode).wallSeconds).toBeLessThanOrEqual(TEST_CEILING_SECONDS + 1);
    }
  });

  it("records the build machine, since its size decides whether the build fits", () => {
    const { stdout } = runBuild("ok");

    expect(stdout).toMatch(/Build machine: \S+ cores, \S+ GB/);
  });

  it("refuses to run when the grace period would swallow the whole ceiling", () => {
    // `timeout 0s` means no limit, so this misconfiguration would turn the
    // script into the unbounded build it exists to prevent. It must not build.
    const misconfigured = join(workdir, "misconfigured.sh");
    writeFileSync(
      misconfigured,
      readFileSync(join(workdir, "vercel-build.sh"), "utf8").replace(
        /^KILL_GRACE_SECONDS=\d+$/m,
        `KILL_GRACE_SECONDS=${TEST_CEILING_SECONDS}`
      )
    );
    const attemptLog = join(workdir, `attempts-misconfigured-${runCounter++}.log`);

    const result = spawnSync("bash", ["misconfigured.sh"], {
      cwd: workdir,
      encoding: "utf8",
      env: {
        ...process.env,
        MODE: "ok",
        ATTEMPT_LOG: attemptLog,
        PATH: `${join(workdir, "bin")}:${process.env.PATH}`,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Misconfigured");
    expect(existsSync(attemptLog)).toBe(false);
  });
});
