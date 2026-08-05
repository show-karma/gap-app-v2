import { cleanDocsMarkdown } from "../../../scripts/generate-llms-txt";

// Covers the docs-site UI chrome that survives Firecrawl's onlyMainContent
// extraction because it lives inside the article element. Kept out of
// generate-llms-txt.test.ts, which is already over the size limit.

describe("cleanDocsMarkdown docs-site chrome", () => {
  it("removes the copy button label", () => {
    const result = cleanDocsMarkdown("Intro paragraph\nCopy\nReal content");
    expect(result.split("\n")).not.toContain("Copy");
    expect(result).toContain("Intro paragraph");
    expect(result).toContain("Real content");
  });

  it("removes the table-of-contents heading", () => {
    const result = cleanDocsMarkdown("Intro paragraph\nOn this page\nReal content");
    expect(result.split("\n")).not.toContain("On this page");
    expect(result).toContain("Intro paragraph");
    expect(result).toContain("Real content");
  });

  it("removes the self-referential llms.txt footer", () => {
    const input =
      "Real content\nFor the complete documentation index, see llms.txt . This page is also available as Markdown .\nMore content";
    const result = cleanDocsMarkdown(input);
    expect(result).not.toContain("llms.txt");
    expect(result).not.toContain("available as Markdown");
    expect(result).toContain("Real content");
    expect(result).toContain("More content");
  });

  it("collapses the blank lines left by adjacent stripped chrome", () => {
    const input =
      "Real content\nFor the complete documentation index, see llms.txt . This page is also available as Markdown .\nCopy\nOn this page\nMore content";
    const result = cleanDocsMarkdown(input);
    expect(result).not.toMatch(/\n{3,}/);
    expect(result).toContain("Real content");
    expect(result).toContain("More content");
  });

  it("keeps prose that merely starts with a stripped keyword", () => {
    const input = "Copy the API key from your dashboard.\nOn this page you will find nothing.";
    const result = cleanDocsMarkdown(input);
    expect(result).toContain("Copy the API key from your dashboard.");
    expect(result).toContain("On this page you will find nothing.");
  });
});
