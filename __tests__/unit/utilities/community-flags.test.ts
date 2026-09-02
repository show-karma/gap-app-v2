import {
  EXPLORER_NAV_OVERRIDES,
  FINANCIALS_ENABLED_COMMUNITIES,
  isTracksAsPrimaryExplorerFacet,
  TRACKS_AS_PRIMARY_EXPLORER_FACET,
} from "@/utilities/community-flags";

describe("community-flags", () => {
  describe("TRACKS_AS_PRIMARY_EXPLORER_FACET / isTracksAsPrimaryExplorerFacet", () => {
    it("lists filecoin", () => {
      expect(TRACKS_AS_PRIMARY_EXPLORER_FACET).toContain("filecoin");
    });

    it("returns true for a community on the list", () => {
      expect(isTracksAsPrimaryExplorerFacet("filecoin")).toBe(true);
    });

    it("returns false for a community not on the list", () => {
      expect(isTracksAsPrimaryExplorerFacet("optimism")).toBe(false);
    });

    it("returns false for an empty communityId", () => {
      expect(isTracksAsPrimaryExplorerFacet("")).toBe(false);
    });
  });

  // Neighbouring flags — unchanged by this feature, asserted so a future edit
  // to this file can't silently drop them.
  describe("existing flags", () => {
    it("keeps FINANCIALS_ENABLED_COMMUNITIES scoped to filecoin", () => {
      expect(FINANCIALS_ENABLED_COMMUNITIES).toEqual(["filecoin"]);
    });

    it("keeps the filecoin EXPLORER_NAV_OVERRIDES entry", () => {
      expect(EXPLORER_NAV_OVERRIDES.filecoin).toBeDefined();
    });
  });
});
