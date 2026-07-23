/**
 * @file `sanity/env.ts` project-id normalization.
 *
 * A malformed `NEXT_PUBLIC_SANITY_PROJECT_ID` must never reach
 * `createClient` — it validates synchronously and throws during Next's
 * page-data collection, which fails the entire production build (every
 * route, not just /blog). These pin the degrade-to-unconfigured contract.
 *
 * `envVars` is mocked per-case rather than via `process.env`: the global
 * suite setup (`__tests__/setup-mocks.ts`) already replaces that module, so
 * setting `process.env` here would never reach `sanity/env`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

/** Re-imports `sanity/env` with `envVars.NEXT_PUBLIC_SANITY_PROJECT_ID` set
 * to the raw value under test. */
async function loadProjectId(raw: string | undefined): Promise<string> {
  vi.resetModules();
  vi.doMock("@/utilities/enviromentVars", () => ({
    envVars: {
      NEXT_PUBLIC_SANITY_PROJECT_ID: raw ?? "",
      NEXT_PUBLIC_SANITY_DATASET: "production",
      NEXT_PUBLIC_SANITY_API_VERSION: "2024-01-01",
    },
  }));
  const mod = await import("@/sanity/env");
  return mod.projectId;
}

afterEach(() => {
  vi.doUnmock("@/utilities/enviromentVars");
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("sanity env projectId", () => {
  it("passes through a well-formed id unchanged", async () => {
    await expect(loadProjectId("tc4p00d9")).resolves.toBe("tc4p00d9");
  });

  it("accepts dashes", async () => {
    await expect(loadProjectId("my-blog-1")).resolves.toBe("my-blog-1");
  });

  it("trims surrounding whitespace and newlines pasted into a dashboard", async () => {
    await expect(loadProjectId("  tc4p00d9\n")).resolves.toBe("tc4p00d9");
  });

  it("is empty when the variable is unset", async () => {
    await expect(loadProjectId(undefined)).resolves.toBe("");
  });

  it("is empty when the variable is only whitespace", async () => {
    await expect(loadProjectId("   ")).resolves.toBe("");
  });

  it.each([
    ["surrounding quotes", '"tc4p00d9"'],
    ["uppercase letters", "TC4P00D9"],
    ["an inner space", "tc4p 00d9"],
    ["a full URL", "https://tc4p00d9.sanity.io"],
    ["an underscore", "tc4p_00d9"],
  ])("degrades to unconfigured for %s", async (_label, raw) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(loadProjectId(raw)).resolves.toBe("");
  });

  it("reports the offending characters and length without echoing the whole value", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await loadProjectId('"tc4p00d9"');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = String(warnSpy.mock.calls[0][0]);
    expect(message).toContain("NEXT_PUBLIC_SANITY_PROJECT_ID");
    expect(message).toContain("length 10");
    expect(message).toContain('"\\""');
    expect(message).not.toContain('"tc4p00d9"');
  });

  it("does not warn for a well-formed id", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await loadProjectId("tc4p00d9");

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
