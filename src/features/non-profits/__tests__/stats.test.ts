import { describe, expect, it } from "vitest";
import { FILINGS_STATS } from "../lib/stats";

describe("FILINGS_STATS", () => {
  it("exposes labels in the casing each surface needs", () => {
    expect(FILINGS_STATS.countShort).toBe("2M+");
    expect(FILINGS_STATS.countLong).toBe("2 million");
    expect(FILINGS_STATS.dollarsTracked).toBe("$1.2T");
  });

  it("provides sentence-fragment copy that fits inline next to other words", () => {
    // Must start lowercase so it reads naturally after "Plain English · " etc.
    expect(FILINGS_STATS.searchingProgressLabel.length).toBeGreaterThan(0);
    expect(FILINGS_STATS.searchingProgressLabel.charAt(0)).toBe(
      FILINGS_STATS.searchingProgressLabel.charAt(0).toLowerCase()
    );
    expect(FILINGS_STATS.composerFooterLabel.length).toBeGreaterThan(0);
    expect(FILINGS_STATS.composerFooterLabel.charAt(0)).toBe(
      FILINGS_STATS.composerFooterLabel.charAt(0).toLowerCase()
    );
  });

  it("provides title-case labels for navbar/hero status", () => {
    expect(FILINGS_STATS.indexedLabel.startsWith("Over")).toBe(true);
    expect(FILINGS_STATS.indexedShortLabel).toContain(FILINGS_STATS.dollarsTracked);
  });
});
