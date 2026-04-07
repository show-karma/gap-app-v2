/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { LiteMarkdown } from "../LiteMarkdown";

function renderMd(md: string) {
  const { container } = render(<LiteMarkdown>{md}</LiteMarkdown>);
  return container.firstChild as HTMLElement;
}

describe("LiteMarkdown", () => {
  it("renders paragraphs", () => {
    const el = renderMd("Hello world");
    expect(el.innerHTML).toContain("<p>Hello world</p>");
  });

  it("renders bold text", () => {
    const el = renderMd("This is **bold** text");
    expect(el.querySelector("strong")?.textContent).toBe("bold");
  });

  it("renders italic text", () => {
    const el = renderMd("This is *italic* text");
    expect(el.querySelector("em")?.textContent).toBe("italic");
  });

  it("renders inline code", () => {
    const el = renderMd("Use `npm install` to install");
    expect(el.querySelector("code")?.textContent).toBe("npm install");
  });

  it("renders fenced code blocks", () => {
    const el = renderMd("```js\nconst x = 1;\n```");
    expect(el.querySelector("pre code")?.textContent).toBe("const x = 1;");
  });

  it("renders unordered lists", () => {
    const el = renderMd("- item one\n- item two");
    const items = el.querySelectorAll("ul li");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe("item one");
  });

  it("renders ordered lists", () => {
    const el = renderMd("1. first\n2. second");
    const items = el.querySelectorAll("ol li");
    expect(items).toHaveLength(2);
  });

  it("renders headers", () => {
    const el = renderMd("## Heading Two");
    expect(el.querySelector("h2")?.textContent).toBe("Heading Two");
  });

  it("renders links with safe attributes", () => {
    const el = renderMd("[click](https://example.com)");
    const link = el.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("strips disallowed tags via sanitizer", () => {
    // Script tags injected through crafted markdown should be stripped
    const el = renderMd("<script>alert('xss')</script>");
    expect(el.querySelector("script")).toBeNull();
    expect(el.innerHTML).not.toContain("script");
  });

  it("strips javascript: URLs in links", () => {
    // Only https? links are matched; javascript: won't match the link regex
    const el = renderMd("[click](javascript:alert(1))");
    expect(el.querySelector("a")).toBeNull();
  });

  it("escapes HTML in code blocks", () => {
    const el = renderMd("```\n<div>dangerous</div>\n```");
    const code = el.querySelector("code");
    expect(code?.textContent).toBe("<div>dangerous</div>");
    expect(code?.innerHTML).toContain("&lt;div&gt;");
  });
});
