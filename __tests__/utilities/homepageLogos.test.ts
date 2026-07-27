import { chosenCommunities } from "@/utilities/chosenCommunities";
import { homepageMarqueeLogos } from "@/utilities/homepageLogos";
import { PAGES } from "@/utilities/pages";

describe("homepageMarqueeLogos", () => {
  const logos = homepageMarqueeLogos();
  const titles = logos.map((logo) => logo.text);

  it("opens with UNICEF, the two partners, then Filecoin", () => {
    expect(titles.slice(0, 4)).toEqual([
      "UNICEF",
      "San Francisco Foundation",
      "Trinity Center",
      "Filecoin",
    ]);
  });

  it("drops the retired community logos", () => {
    expect(titles).not.toContain("Lisk");
    expect(titles).not.toContain("Livepeer");
    expect(titles).not.toContain("Scroll");
  });

  it("keeps the retired communities in chosenCommunities so their pages still resolve", () => {
    const slugs = chosenCommunities(true).map((community) => community.slug);
    expect(slugs).toEqual(expect.arrayContaining(["lisk", "livepeer", "scroll"]));
  });

  it("keeps every remaining community exactly once", () => {
    const communityTitles = chosenCommunities(true)
      .filter((community) => !["lisk", "livepeer", "scroll"].includes(community.slug))
      .map((community) => community.name);

    expect(titles).toEqual(expect.arrayContaining(communityTitles));
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("links community pills at their grants page and leaves partner pills unlinked", () => {
    const unicef = logos.find((logo) => logo.text === "UNICEF");
    const partner = logos.find((logo) => logo.text === "San Francisco Foundation");

    expect(unicef?.href).toBe(PAGES.COMMUNITY.ALL_GRANTS("unicef"));
    expect(partner?.href).toBeUndefined();
  });

  it("gives every logo a light and dark image", () => {
    logos.forEach((logo) => {
      expect(logo.image.light).toBeTruthy();
      expect(logo.image.dark).toBeTruthy();
    });
  });
});
