import * as fs from "node:fs";
import * as path from "node:path";

const PUBLIC_DIR = path.resolve(__dirname, "../../public");
const STYLES_DIR = path.resolve(__dirname, "../../styles");

describe("Font optimization", () => {
  describe("WOFF2 variable font", () => {
    it("should have Inter.woff2 variable font file", () => {
      const woff2Path = path.join(PUBLIC_DIR, "fonts/Inter/Inter.woff2");
      expect(fs.existsSync(woff2Path)).toBe(true);
    });

    it("should have Inter.woff2 smaller than 400KB", () => {
      const woff2Path = path.join(PUBLIC_DIR, "fonts/Inter/Inter.woff2");
      const stats = fs.statSync(woff2Path);
      expect(stats.size).toBeLessThan(400 * 1024);
    });
  });

  describe("CSS @font-face declarations", () => {
    let cssContent: string;

    beforeAll(() => {
      cssContent = fs.readFileSync(path.join(STYLES_DIR, "globals.css"), "utf-8");
    });

    it("should reference Inter.woff2 variable font", () => {
      expect(cssContent).toContain("/fonts/Inter/Inter.woff2");
      expect(cssContent).toContain('format("woff2")');
    });

    it("should use font-weight range 100 900 for variable font", () => {
      expect(cssContent).toContain("font-weight: 100 900");
    });

    it("should NOT contain individual static TTF font references", () => {
      const staticFontPattern =
        /Inter-(?:Thin|ExtraLight|Light|Regular|Medium|SemiBold|Bold|ExtraBold|Black)\.ttf/;
      expect(cssContent).not.toMatch(staticFontPattern);
    });

    it("should have font-display: swap for performance", () => {
      expect(cssContent).toContain("font-display: swap");
    });
  });

  describe("Static TTF files cleanup", () => {
    it("should NOT have static font directory", () => {
      const staticDir = path.join(PUBLIC_DIR, "fonts/Inter/static");
      expect(fs.existsSync(staticDir)).toBe(false);
    });
  });
});
