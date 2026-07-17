import {
  getWhitelabelByDomain,
  toHslToken,
  WHITELABEL_DOMAINS,
} from "@/utilities/whitelabel-config";

describe("whitelabel-config", () => {
  describe("getWhitelabelByDomain", () => {
    it("resolves domains case-insensitively and ignores port", () => {
      const primaryWhitelabel = WHITELABEL_DOMAINS[0];
      if (!primaryWhitelabel) {
        throw new Error("No whitelabel domain configured for tests.");
      }

      const config = getWhitelabelByDomain(`${primaryWhitelabel.domain.toUpperCase()}:3000`);

      expect(config?.domain).toBe(primaryWhitelabel.domain);
      expect(config?.name).toBe(primaryWhitelabel.name);
    });

    it("returns null for unknown domains", () => {
      expect(getWhitelabelByDomain("example.com")).toBeNull();
    });

    it("configures button foreground colors independently from primary colors", () => {
      const optimism = getWhitelabelByDomain("app.opgrants.io");
      const filecoin = getWhitelabelByDomain("app.filpgf.io");

      expect(optimism?.theme?.buttonTextColor).toBe("#FFFFFF");
      expect(filecoin?.theme?.buttonTextColor).toBe("#FFFFFF");
    });
  });

  describe("toHslToken", () => {
    it("converts hex colors into HSL token format", () => {
      expect(toHslToken("#FF0420")).toBe("353 100% 51%");
    });

    it("returns valid HSL tokens unchanged", () => {
      expect(toHslToken("350 100% 51%")).toBe("350 100% 51%");
    });

    it("returns null for unsupported values", () => {
      expect(toHslToken("rgb(0, 0, 0)")).toBeNull();
    });
  });
});
