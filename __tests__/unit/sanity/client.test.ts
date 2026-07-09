import { afterEach, describe, expect, it, vi } from "vitest";

describe("sanity client + image builder import", () => {
  const originalProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

  afterEach(() => {
    if (originalProjectId === undefined) {
      delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    } else {
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = originalProjectId;
    }
  });

  it("stays importable when NEXT_PUBLIC_SANITY_PROJECT_ID is unset", async () => {
    delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    await expect(import("@/sanity/lib/client")).resolves.toHaveProperty("client");
  });

  it("uses the non-deprecated named export of @sanity/image-url", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("@/sanity/lib/image");
    expect(typeof mod.urlForImage).toBe("function");
    const deprecationWarning = warnSpy.mock.calls.find((call) =>
      String(call[0]).includes("deprecated")
    );
    expect(deprecationWarning).toBeUndefined();
    warnSpy.mockRestore();
  });
});
