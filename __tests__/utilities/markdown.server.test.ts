import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "@/utilities/markdown.server";

describe("renderMarkdownToHtml", () => {
  it("returns an empty string for empty input", () => {
    expect(renderMarkdownToHtml("")).toBe("");
    expect(renderMarkdownToHtml(undefined)).toBe("");
    expect(renderMarkdownToHtml(null)).toBe("");
  });

  it("renders a leading `# ` as <h1> by default (no offset)", () => {
    expect(renderMarkdownToHtml("# Brief")).toContain("<h1>Brief</h1>");
  });

  it("demotes headings by the given offset so content never emits an <h1>", () => {
    const html = renderMarkdownToHtml("# Brief\n\n## Detail", { headingOffset: 1 });
    expect(html).toContain("<h2>Brief</h2>");
    expect(html).toContain("<h3>Detail</h3>");
    expect(html).not.toContain("<h1>");
  });

  it("clamps demoted headings at <h6>", () => {
    const html = renderMarkdownToHtml("###### Deep", { headingOffset: 1 });
    expect(html).toContain("<h6>Deep</h6>");
    expect(html).not.toContain("<h7>");
  });

  it("leaves headings untouched when offset is 0", () => {
    expect(renderMarkdownToHtml("## Section", { headingOffset: 0 })).toContain("<h2>Section</h2>");
  });

  it("still opens links in a new tab with nofollow when demoting", () => {
    const html = renderMarkdownToHtml("# [x](https://example.com)", { headingOffset: 1 });
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="nofollow noopener noreferrer"');
  });
});
