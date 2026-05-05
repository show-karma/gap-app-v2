/**
 * @file Tests for communityColors utility
 * @description Verifies community color resolution, fallback behavior,
 * and the structure of the color mapping.
 */

import { communityColors } from "@/utilities/communityColors";

describe("communityColors", () => {
  describe("known community color resolution", () => {
    it("should resolve 'black' to #000000", () => {
      expect(communityColors.black).toBe("#000000");
    });

    it("should resolve known community UIDs to their configured hex colors", () => {
      // Verify a few known UID -> color mappings from the production config
      expect(
        communityColors["0x6193e5151e8fde7f4ca2e16f31a42effe56cbafa126423941cbe7ff51a5143bd"]
      ).toBe("#448BF2");

      expect(
        communityColors["0x6b154a62b0b5d53bbded9c4f60131934ee2738596129bc658420664d26f1c785"]
      ).toBe("#206bd6");

      expect(
        communityColors["0x4213c5a9efc98eea6aea52a1fbfc74fef758de750083de2572723c286ac4b5e2"]
      ).toBe("#FC031F");

      expect(
        communityColors["0x838fa5fcdf99f4e6e28aef702d1780b155015602413c15e7242819e2e5dd0113"]
      ).toBe("#4cc38a");

      expect(
        communityColors["0x5e85f26150e28595525573a8ed18a98049435256d1c93a7132079914864902be"]
      ).toBe("#ecf0f1");
    });

    it("should have all values as valid hex color strings", () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/;
      for (const [key, color] of Object.entries(communityColors)) {
        expect(color).toMatch(hexPattern);
      }
    });
  });

  describe("unknown community fallback behavior", () => {
    it("should return undefined for unknown community UIDs", () => {
      expect(communityColors["unknown-uid"]).toBeUndefined();
    });

    it("should return undefined for empty string key", () => {
      expect(communityColors[""]).toBeUndefined();
    });

    it("should return undefined for a valid-looking but non-existent UID", () => {
      expect(
        communityColors["0x0000000000000000000000000000000000000000000000000000000000000000"]
      ).toBeUndefined();
    });
  });

  describe("lookup pattern used in production code", () => {
    // The production code uses: communityColors[uid?.toLowerCase() || "black"] ?? "#000000"
    // This tests that pattern works correctly.

    it("should resolve to a color when uid matches a known key", () => {
      const uid = "0x6193e5151e8fde7f4ca2e16f31a42effe56cbafa126423941cbe7ff51a5143bd";
      const color = communityColors[uid.toLowerCase() || "black"] ?? "#000000";
      expect(color).toBe("#448BF2");
    });

    it("should fall back to 'black' entry when uid is null/undefined", () => {
      const uid: string | undefined = undefined;
      const color = communityColors[uid?.toLowerCase() || "black"] ?? "#000000";
      expect(color).toBe("#000000");
    });

    it("should fall back to #000000 when uid is unknown and 'black' somehow missing", () => {
      const uid = "totally-unknown-community";
      const color = communityColors[uid.toLowerCase() || "black"] ?? "#000000";
      // uid does not match any key, so communityColors returns undefined, fallback is #000000
      expect(color).toBe("#000000");
    });

    it("should use 'black' fallback when uid is an empty string", () => {
      const uid = "";
      const color = communityColors[uid.toLowerCase() || "black"] ?? "#000000";
      // Empty string is falsy, so || "black" kicks in
      expect(color).toBe("#000000");
    });
  });

  describe("structure", () => {
    it("should be a non-empty record", () => {
      expect(Object.keys(communityColors).length).toBeGreaterThan(0);
    });

    it("should contain the 'black' fallback key", () => {
      expect(communityColors).toHaveProperty("black");
    });

    it("should have all keys as strings (UIDs or named keys)", () => {
      for (const key of Object.keys(communityColors)) {
        expect(typeof key).toBe("string");
        expect(key.length).toBeGreaterThan(0);
      }
    });
  });
});
