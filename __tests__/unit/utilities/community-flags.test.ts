import {
  EXPLORER_NAV_OVERRIDES,
  FINANCIALS_ENABLED_COMMUNITIES,
} from "@/utilities/community-flags";

describe("community-flags", () => {
  // Asserted so a future edit to this file can't silently drop them.
  describe("existing flags", () => {
    it("keeps FINANCIALS_ENABLED_COMMUNITIES scoped to filecoin", () => {
      expect(FINANCIALS_ENABLED_COMMUNITIES).toEqual(["filecoin"]);
    });

    it("keeps the filecoin EXPLORER_NAV_OVERRIDES entry", () => {
      expect(EXPLORER_NAV_OVERRIDES.filecoin).toBeDefined();
    });
  });
});
