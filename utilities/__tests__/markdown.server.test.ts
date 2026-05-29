import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "../markdown.server";

describe("renderMarkdownToHtml", () => {
  it("returns an empty string for empty/nullish input", () => {
    expect(renderMarkdownToHtml("")).toBe("");
    expect(renderMarkdownToHtml(undefined)).toBe("");
    expect(renderMarkdownToHtml(null)).toBe("");
  });

  it("renders basic markdown to HTML", () => {
    const html = renderMarkdownToHtml("# Title\n\nSome **bold** text.");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("adds nofollow + new-tab attributes to links", () => {
    const html = renderMarkdownToHtml("[karma](https://karmahq.xyz)");
    expect(html).toContain('rel="nofollow noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("escapes embedded raw HTML (html:false)", () => {
    const html = renderMarkdownToHtml("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("does not emit anchors with a javascript: protocol", () => {
    const html = renderMarkdownToHtml("[x](javascript:alert(1))");
    // markdown-it rejects the unsafe URL: no link is created (left as inert text).
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain("<a ");
  });
});
