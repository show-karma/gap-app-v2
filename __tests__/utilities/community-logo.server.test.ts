import {
  communityLogoPath,
  inlineImageHash,
  parseInlineImage,
  replaceInlineCommunityLogos,
} from "@/utilities/community-logo.server";
import { COMMUNITY_LOGO_ROUTE } from "@/utilities/community-logo-route";

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const feed = (image: string) => ({
  grantMilestones: [
    { uid: "m1", grant: { uid: "g1", communitySlug: "gitcoin", communityImage: image } },
    { uid: "m2", grant: { uid: "g1", communitySlug: "gitcoin", communityImage: image } },
  ],
  grantUpdates: [
    {
      uid: "u1",
      grant: {
        uid: "g2",
        communitySlug: "optimism",
        communityImage: "https://cdn.example/op.png",
      },
    },
  ],
});

describe("parseInlineImage", () => {
  it("decodes raster data URIs", () => {
    const image = parseInlineImage(PIXEL);
    expect(image?.mimeType).toBe("image/png");
    expect(image?.bytes.byteLength).toBeGreaterThan(0);
  });

  it.each([
    [
      "an SVG, which could run script from our origin",
      "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    ],
    ["a normal URL", "https://cdn.example/logo.png"],
    ["a non-base64 data URI", "data:image/png,hello"],
    ["a non-string", 42],
  ])("rejects %s", (_label, value) => {
    expect(parseInlineImage(value)).toBeNull();
  });
});

describe("communityLogoPath", () => {
  it("is stable for the same image and changes with it", () => {
    expect(communityLogoPath("gitcoin", PIXEL)).toBe(
      `${COMMUNITY_LOGO_ROUTE}/gitcoin/${inlineImageHash(PIXEL)}`
    );
    expect(inlineImageHash(PIXEL)).toMatch(/^[0-9a-f]{16}$/);
    expect(inlineImageHash(`${PIXEL}A`)).not.toBe(inlineImageHash(PIXEL));
  });
});

describe("replaceInlineCommunityLogos", () => {
  it("links the logo once per community instead of embedding it per item", async () => {
    const lookup = vi.fn(async () => PIXEL);
    const input = feed(PIXEL);

    const out = await replaceInlineCommunityLogos(input, lookup);

    const path = communityLogoPath("gitcoin", PIXEL);
    expect(out.grantMilestones.map((m) => m.grant.communityImage)).toEqual([path, path]);
    expect(out.grantUpdates[0].grant.communityImage).toBe("https://cdn.example/op.png");
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("gitcoin");
    // The input is left as it was.
    expect(input.grantMilestones[0].grant.communityImage).toBe(PIXEL);
  });

  it("keeps the inline image when it is not the community's current logo", async () => {
    const out = await replaceInlineCommunityLogos(feed(PIXEL), async () => `${PIXEL}A`);
    expect(out.grantMilestones[0].grant.communityImage).toBe(PIXEL);
  });

  it("keeps the inline image when the lookup fails", async () => {
    const out = await replaceInlineCommunityLogos(feed(PIXEL), async () => {
      throw new Error("indexer down");
    });
    expect(out.grantMilestones[0].grant.communityImage).toBe(PIXEL);
  });

  it("returns the same object when nothing is inline", async () => {
    const input = feed("https://cdn.example/gitcoin.png");
    const lookup = vi.fn();
    await expect(replaceInlineCommunityLogos(input, lookup)).resolves.toBe(input);
    expect(lookup).not.toHaveBeenCalled();
  });
});
