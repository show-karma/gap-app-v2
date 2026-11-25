import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let currentHeaders = new Headers();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => currentHeaders),
}));

import { GET } from "@/app/api/geo/route";

const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

function setCloudflareContext(cf?: Record<string, unknown>) {
  (globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL] = cf ? { cf } : undefined;
}

describe("GET /api/geo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL", undefined);
    currentHeaders = new Headers();
    delete (globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL];
  });

  it("reads forwarded x-karma-cf-* headers and decodes percent-encoded Unicode city on Cloudflare", async () => {
    currentHeaders = new Headers({
      "x-karma-cf-country": "br",
      "x-karma-cf-region": "SP",
      "x-karma-cf-city": "S%C3%A3o%20Paulo",
    });

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      country: "BR",
      region: "SP",
      city: "São Paulo",
    });
  });

  it("falls back to cf-ipcountry when x-karma-cf-country is absent", async () => {
    currentHeaders = new Headers({ "cf-ipcountry": "de" });

    const res = await GET();
    await expect(res.json()).resolves.toEqual({
      country: "DE",
      region: null,
      city: null,
    });
  });

  it("rejects Cloudflare XX and T1 sentinel country codes and defaults to US", async () => {
    for (const code of ["XX", "T1", "invalid"]) {
      currentHeaders = new Headers({ "cf-ipcountry": code });
      const res = await GET();
      await expect(res.json()).resolves.toEqual({
        country: "US",
        region: null,
        city: null,
      });
    }
  });

  it("reads globalThis Cloudflare context directly when present (single-worker / wrangler dev)", async () => {
    setCloudflareContext({
      country: "fr",
      regionCode: "IDF",
      region: "Île-de-France",
      city: "Paris",
    });

    const res = await GET();
    await expect(res.json()).resolves.toEqual({
      country: "FR",
      region: "IDF",
      city: "Paris",
    });
  });

  it("reads Vercel headers and ignores Cloudflare headers when VERCEL is set", async () => {
    vi.stubEnv("VERCEL", "1");
    currentHeaders = new Headers({
      "cf-ipcountry": "BR",
      "x-karma-cf-country": "BR",
      "x-karma-cf-region": "SP",
      "x-karma-cf-city": "S%C3%A3o%20Paulo",
      "x-vercel-ip-country": "gb",
      "x-vercel-ip-country-region": "ENG",
      "x-vercel-ip-city": "London",
    });

    const res = await GET();
    await expect(res.json()).resolves.toEqual({
      country: "GB",
      region: "ENG",
      city: "London",
    });
  });

  it("does not throw on malformed percent-encoding in city header", async () => {
    currentHeaders = new Headers({
      "x-karma-cf-country": "BR",
      "x-karma-cf-city": "100%raw",
    });

    const res = await GET();
    await expect(res.json()).resolves.toEqual({
      country: "BR",
      region: null,
      city: "100%raw",
    });
  });

  it("defaults to US with null region and city when no geo headers are present", async () => {
    const res = await GET();
    await expect(res.json()).resolves.toEqual({
      country: "US",
      region: null,
      city: null,
    });
  });
});
