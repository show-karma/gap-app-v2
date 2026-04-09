import { render } from "@testing-library/react";
import { WidgetMarkdown } from "../WidgetMarkdown";

describe("WidgetMarkdown", () => {
  function renderMarkdown(md: string) {
    const { container } = render(<WidgetMarkdown>{md}</WidgetMarkdown>);
    return container.firstElementChild as HTMLElement;
  }

  describe("inline formatting", () => {
    it("renders bold text", () => {
      const el = renderMarkdown("**bold**");
      expect(el.querySelector("strong")?.textContent).toBe("bold");
    });

    it("renders italic text", () => {
      const el = renderMarkdown("*italic*");
      expect(el.querySelector("em")?.textContent).toBe("italic");
    });

    it("renders bold+italic text", () => {
      const el = renderMarkdown("***both***");
      const strong = el.querySelector("strong");
      expect(strong?.querySelector("em")?.textContent).toBe("both");
    });

    it("renders inline code", () => {
      const el = renderMarkdown("use `npm install`");
      expect(el.querySelector("code")?.textContent).toBe("npm install");
    });
  });

  describe("block elements", () => {
    it("renders headers h1-h4", () => {
      const el = renderMarkdown("# H1\n## H2\n### H3\n#### H4");
      expect(el.querySelector("h1")?.textContent).toBe("H1");
      expect(el.querySelector("h2")?.textContent).toBe("H2");
      expect(el.querySelector("h3")?.textContent).toBe("H3");
      expect(el.querySelector("h4")?.textContent).toBe("H4");
    });

    it("renders unordered lists", () => {
      const el = renderMarkdown("- item one\n- item two");
      const items = el.querySelectorAll("li");
      expect(items).toHaveLength(2);
      expect(items[0].textContent).toBe("item one");
    });

    it("renders ordered lists", () => {
      const el = renderMarkdown("1. first\n2. second");
      const ol = el.querySelector("ol");
      expect(ol).toBeTruthy();
      expect(ol?.querySelectorAll("li")).toHaveLength(2);
    });

    it("renders fenced code blocks with HTML escaping", () => {
      const el = renderMarkdown("```js\nconst x = '<div>';\n```");
      const pre = el.querySelector("pre");
      expect(pre).toBeTruthy();
      expect(pre?.textContent).toContain("const x = '<div>';");
    });

    it("renders paragraphs", () => {
      const el = renderMarkdown("Hello world");
      expect(el.querySelector("p")?.textContent).toBe("Hello world");
    });
  });

  describe("links", () => {
    it("renders https links with safe attributes", () => {
      const el = renderMarkdown("[Karma](https://karmahq.xyz)");
      const link = el.querySelector("a");
      expect(link?.textContent).toBe("Karma");
      expect(link?.getAttribute("href")).toBe("https://karmahq.xyz");
      expect(link?.getAttribute("target")).toBe("_blank");
      expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("renders http links", () => {
      const el = renderMarkdown("[test](http://example.com)");
      const link = el.querySelector("a");
      expect(link?.getAttribute("href")).toBe("http://example.com");
    });

    it("does not render non-http links from markdown syntax", () => {
      const el = renderMarkdown("[click](javascript:alert(1))");
      const link = el.querySelector("a");
      expect(link).toBeNull();
    });
  });

  describe("XSS sanitization", () => {
    it("strips script tags", () => {
      const el = renderMarkdown('<script>alert("xss")</script>');
      expect(el.querySelector("script")).toBeNull();
      expect(el.innerHTML).not.toContain("<script");
    });

    it("strips img tags with onerror", () => {
      const el = renderMarkdown('<img src=x onerror="alert(1)">');
      expect(el.querySelector("img")).toBeNull();
    });

    it("strips disallowed attributes from allowed tags", () => {
      const el = renderMarkdown("**bold**");
      const strong = el.querySelector("strong");
      expect(strong?.attributes).toHaveLength(0);
    });

    it("strips javascript: protocol from raw HTML anchor href", () => {
      const el = renderMarkdown('<a href="javascript:alert(1)">click</a>');
      const link = el.querySelector("a");
      expect(link?.getAttribute("href")).toBeNull();
    });

    it("strips JAVASCRIPT: protocol (case insensitive)", () => {
      const el = renderMarkdown('<a href="JAVASCRIPT:alert(1)">click</a>');
      const link = el.querySelector("a");
      expect(link?.getAttribute("href")).toBeNull();
    });

    it("strips data: URI from anchor href", () => {
      const el = renderMarkdown('<a href="data:text/html,<script>alert(1)</script>">click</a>');
      const link = el.querySelector("a");
      expect(link?.getAttribute("href")).toBeNull();
    });

    it("allows https href on raw HTML anchors", () => {
      const el = renderMarkdown('<a href="https://safe.com">safe</a>');
      const link = el.querySelector("a");
      expect(link?.getAttribute("href")).toBe("https://safe.com");
    });

    it("replaces disallowed tags with text content", () => {
      const el = renderMarkdown("<div>content inside div</div>");
      expect(el.querySelector("div")).toBeNull(); // inner div stripped (only the wrapper div remains)
      expect(el.textContent).toContain("content inside div");
    });
  });

  describe("edge cases", () => {
    it("renders empty string without crash", () => {
      const el = renderMarkdown("");
      expect(el).toBeTruthy();
    });

    it("renders CJK characters", () => {
      const el = renderMarkdown("你好世界");
      expect(el.textContent).toContain("你好世界");
    });

    it("escapes HTML in inline code", () => {
      const el = renderMarkdown("`<script>alert(1)</script>`");
      expect(el.querySelector("script")).toBeNull();
      expect(el.querySelector("code")?.textContent).toContain("<script>");
    });
  });
});
