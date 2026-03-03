import { extractCommunityFromPath } from "@/src/infrastructure/middleware/tenant-detection";

describe("extractCommunityFromPath", () => {
  // Valid tenant slugs: "karma", "optimism", "arbitrum", "celo", "polygon",
  // "scroll", "celopg", "regen-coordination", "localism-fund", "filecoin", "for-the-world"

  it("returns tenant id when first path segment matches a known slug", () => {
    expect(extractCommunityFromPath("/optimism/programs")).toBe("optimism");
  });

  it("returns tenant id for arbitrum whitelabel-style path", () => {
    expect(extractCommunityFromPath("/arbitrum/grants/123")).toBe("arbitrum");
  });

  it("returns null for /community/optimism/programs (first segment 'community' is not a slug)", () => {
    expect(extractCommunityFromPath("/community/optimism/programs")).toBeNull();
  });

  it("returns null for /community/ with no further slug", () => {
    expect(extractCommunityFromPath("/community/")).toBeNull();
  });

  it("returns null for root path /", () => {
    expect(extractCommunityFromPath("/")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractCommunityFromPath("")).toBeNull();
  });

  it("returns null for /community/unknown-slug/page (first segment not a known tenant)", () => {
    expect(extractCommunityFromPath("/community/unknown-slug/page")).toBeNull();
  });

  it("returns null for /community/arbitrum/grants/123 (first segment is 'community', not 'arbitrum')", () => {
    expect(extractCommunityFromPath("/community/arbitrum/grants/123")).toBeNull();
  });

  it("returns 'filecoin' for /filecoin/projects", () => {
    expect(extractCommunityFromPath("/filecoin/projects")).toBe("filecoin");
  });

  it("returns 'regen-coordination' for hyphenated slug path", () => {
    expect(extractCommunityFromPath("/regen-coordination/programs")).toBe("regen-coordination");
  });

  it("returns null for /unknown-community/programs", () => {
    expect(extractCommunityFromPath("/unknown-community/programs")).toBeNull();
  });
});
