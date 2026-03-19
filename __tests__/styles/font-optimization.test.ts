import * as fs from "node:fs";
import * as path from "node:path";

const PUBLIC_DIR = path.resolve(__dirname, "../../public");
const LAYOUT_PATH = path.resolve(__dirname, "../../app/layout.tsx");

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

    it("should NOT have static Inter.ttf file (replaced by woff2)", () => {
      const ttfPath = path.join(PUBLIC_DIR, "fonts/Inter/Inter.ttf");
      expect(fs.existsSync(ttfPath)).toBe(false);
    });
  });

  describe("next/font/local integration", () => {
    let layoutContent: string;

    beforeAll(() => {
      layoutContent = fs.readFileSync(LAYOUT_PATH, "utf-8");
    });

    it("should import localFont from next/font/local", () => {
      expect(layoutContent).toContain('from "next/font/local"');
    });

    it("should configure Inter with display optional to eliminate FOUT/CLS", () => {
      expect(layoutContent).toContain('display: "optional"');
    });

    it("should reference Inter.woff2 as the font source", () => {
      expect(layoutContent).toContain("Inter.woff2");
    });

    it("should set --font-inter CSS variable", () => {
      expect(layoutContent).toContain('variable: "--font-inter"');
    });

    it("should apply inter.variable to html element", () => {
      expect(layoutContent).toContain("inter.variable");
    });
  });

  describe("Static TTF files cleanup", () => {
    it("should NOT have static font directory", () => {
      const staticDir = path.join(PUBLIC_DIR, "fonts/Inter/static");
      expect(fs.existsSync(staticDir)).toBe(false);
    });
  });
});
