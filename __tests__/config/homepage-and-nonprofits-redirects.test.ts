import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import { NONPROFITS_ORIGIN } from "@/utilities/domains";

async function redirectFor(source: string) {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  return redirects.find((rule) => rule.source === source);
}

describe("homepage and nonprofits redirects", () => {
  it("permanently redirects the old /foundations landing page to the homepage", async () => {
    expect(await redirectFor("/foundations")).toMatchObject({ destination: "/", permanent: true });
  });

  it.each([
    "/nonprofits",
    "/nonprofits/find-funders/:path*",
    "/nonprofits/find-funders-deep-research",
  ])("permanently redirects %s to the nonprofits app", async (source) => {
    expect(await redirectFor(source)).toMatchObject({
      destination: NONPROFITS_ORIGIN,
      permanent: true,
    });
  });

  it("leaves the AI-readiness checker under /nonprofits alone", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    const sources = redirects
      .filter((rule) => rule.destination === NONPROFITS_ORIGIN)
      .map((rule) => rule.source);
    expect(sources).not.toContain("/nonprofits/:path*");
    expect(sources.some((source) => source.includes("is-ai-ready"))).toBe(false);
  });
});
