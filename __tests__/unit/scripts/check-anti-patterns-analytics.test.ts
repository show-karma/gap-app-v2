/**
 * @file The `[ANALYTICS]` check in `scripts/check-anti-patterns.sh`, run for real.
 *
 * The check is a grep, and a grep is exactly the kind of thing that quietly
 * stops matching. It already did once: the pattern only understood double
 * quotes, so `track('name')` and track(`name`) walked straight past it for as
 * long as nobody looked. Asserting on the script's own output is the only way
 * to know it still fires — reading the regex proves nothing.
 *
 * Fixtures are written to a temp directory rather than committed, so they
 * cannot be picked up by the linter, the type-checker or the checker's own
 * whole-repo run.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(process.cwd(), "scripts/check-anti-patterns.sh");

let workdir: string;

const fixture = (name: string, contents: string): string => {
  const path = join(workdir, name);
  writeFileSync(path, contents, "utf8");
  return path;
};

const check = (path: string) => {
  const result = spawnSync("bash", [SCRIPT, path], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return { status: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
};

/** The `[ANALYTICS]` findings only, so an unrelated rule cannot mask a miss. */
const analyticsFindings = (output: string): string =>
  output
    .split("\n")
    .filter((line) => line.includes("[ANALYTICS]"))
    .join("\n");

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), "anti-patterns-analytics-"));
});

afterAll(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe("[ANALYTICS] event-name check", () => {
  it("reports an unknown name in every quote style, and passes the real ones", () => {
    const path = fixture(
      "mixed.ts",
      [
        'import { track } from "@/utilities/analytics/client";',
        "",
        "export function emit() {",
        '  track("not_a_catalog_event", {});',
        "  track('also_not_a_catalog_event', {});",
        "  track(`still_not_a_catalog_event`, {});",
        '  track("login_started", { entry_point: "navbar" });',
        "  track('logout', { reason: 'user' });",
        "  track(`onboarding_completed`, {});",
        "}",
        "",
      ].join("\n")
    );

    const { status, output } = check(path);
    const findings = analyticsFindings(output);

    expect(status).toBe(1);
    expect(findings).toContain("not_a_catalog_event");
    expect(findings).toContain("also_not_a_catalog_event");
    expect(findings).toContain("still_not_a_catalog_event");

    // The three real catalog names must not be reported, whatever they are
    // quoted with. `login_started` is a substring of nothing else here, so a
    // bare `toContain` check is safe.
    expect(findings).not.toContain("login_started");
    expect(findings).not.toContain("logout");
    expect(findings).not.toContain("onboarding_completed");
  });

  it("passes a file that only uses catalog names", () => {
    const path = fixture(
      "clean.ts",
      [
        'import { track } from "@/utilities/analytics/client";',
        "",
        "export function emit() {",
        '  track("project_edited", { project_id: "0x1", fields_changed: ["title"] });',
        "  track('report_shared', { report_id: 'r1', share_type: 'link' });",
        "  track(`onboarding_dismissed`, { step: 'welcome' });",
        "}",
        "",
      ].join("\n")
    );

    const { status, output } = check(path);

    expect(analyticsFindings(output)).toBe("");
    expect(status).toBe(0);
  });

  it("reports the Mixpanel SDK reached outside the client module", () => {
    const path = fixture(
      "raw-sdk.ts",
      [
        'import mixpanel from "mixpanel-browser";',
        "",
        "export function emit() {",
        '  mixpanel.track("login_started", {});',
        "}",
        "",
      ].join("\n")
    );

    const { status, output } = check(path);
    const findings = analyticsFindings(output);

    expect(status).toBe(1);
    expect(findings).toContain("mixpanel-browser");
    expect(findings).toContain("Raw Mixpanel SDK call");
  });

  it("names the line each unknown event was found on", () => {
    // The finding has to be actionable: a name with no line number sends the
    // reader looking through the whole file for it.
    const path = fixture(
      "located.ts",
      [
        'import { track } from "@/utilities/analytics/client";',
        "",
        'track("unknown_event_name", {});',
        "",
      ].join("\n")
    );

    const findings = analyticsFindings(check(path).output);

    expect(findings).toMatch(/L:3\s+unknown_event_name/);
  });
});
