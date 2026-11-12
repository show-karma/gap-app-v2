import { fetchFromLocalApi, localApiBaseUrl } from "@/utilities/fetchFromServer";

describe("localApiBaseUrl", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_ENV", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the Vercel deployment's own hostname, so a preview calls its own API", () => {
    vi.stubEnv("VERCEL_URL", "gap-app-v2-git-feat-x-karma-devs.vercel.app");
    expect(localApiBaseUrl()).toBe("https://gap-app-v2-git-feat-x-karma-devs.vercel.app/api");
  });

  it("falls back to the canonical production origin off Vercel", async () => {
    const { CANONICAL_ORIGIN } = await import("@/utilities/domains");
    vi.stubEnv("NEXT_PUBLIC_ENV", "production");
    expect(localApiBaseUrl()).toBe(`${CANONICAL_ORIGIN}/api`);
  });

  it("falls back to the staging origin off Vercel outside production", async () => {
    const { STAGING_ORIGIN } = await import("@/utilities/domains");
    expect(localApiBaseUrl()).toBe(`${STAGING_ORIGIN}/api`);
  });
});

describe("fetchFromLocalApi", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("requests an absolute URL under the local API base", async () => {
    vi.stubEnv("VERCEL_URL", "preview-abc.vercel.app");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(fetchFromLocalApi("/health")).resolves.toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledWith("https://preview-abc.vercel.app/api/health", {
      method: "GET",
    });
  });
});
