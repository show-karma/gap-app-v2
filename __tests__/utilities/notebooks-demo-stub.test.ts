import { describe, expect, it } from "vitest";
import {
  isNotebookDemoStubEnabled,
  notebookDemoConfig,
  notebookDemoList,
} from "@/utilities/notebooks-demo-stub";

/**
 * The demo stub stands in for one missing registry row on preview. These
 * assertions are the reason it is safe to merge before it is removed: they pin
 * that it is inert everywhere except a preview of this one branch.
 *
 * If this file is deleted, delete the stub with it.
 */

const PREVIEW = {
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "feat/notebook-pages",
} as unknown as NodeJS.ProcessEnv;

describe("notebook demo stub gating", () => {
  // The assertion that matters most. VERCEL_ENV is set by Vercel and is
  // "production" on a production deployment, so no flag and no branch can turn
  // the stub on there.
  it.each([
    ["production, even with the flag on", { VERCEL_ENV: "production", NOTEBOOK_DEMO_STUB: "true" }],
    [
      "production, even on the demo branch",
      { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "feat/notebook-pages" },
    ],
    ["development", { VERCEL_ENV: "development", NOTEBOOK_DEMO_STUB: "true" }],
    ["an unset environment", {}],
    ["an unrecognised environment", { VERCEL_ENV: "staging", NOTEBOOK_DEMO_STUB: "true" }],
  ])("stays off in %s", (_label, env) => {
    expect(isNotebookDemoStubEnabled(env as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  // Second gate: a preview of some other branch must not serve the demo either.
  it("stays off on a preview of an unrelated branch with no flag", () => {
    expect(
      isNotebookDemoStubEnabled({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "feat/something-else",
      } as unknown as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it("turns on for a preview of the demo branch", () => {
    expect(isNotebookDemoStubEnabled(PREVIEW)).toBe(true);
  });

  it("turns on for any preview when explicitly flagged", () => {
    expect(
      isNotebookDemoStubEnabled({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "feat/something-else",
        NOTEBOOK_DEMO_STUB: "true",
      } as unknown as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it("treats any value other than the literal true as off", () => {
    expect(
      isNotebookDemoStubEnabled({
        VERCEL_ENV: "preview",
        NOTEBOOK_DEMO_STUB: "1",
      } as unknown as NodeJS.ProcessEnv)
    ).toBe(false);
  });
});

describe("notebook demo stub scope", () => {
  // In the test environment VERCEL_ENV is unset, so the gate is closed — which
  // is itself the point: the stub is off by default everywhere.
  it("returns nothing when the gate is closed, whatever is asked for", () => {
    expect(notebookDemoConfig("filecoin", "grants-overview")).toBeNull();
    expect(notebookDemoList("filecoin")).toEqual([]);
  });
});
