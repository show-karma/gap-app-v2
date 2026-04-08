/**
 * XSS/Sanitization tests for markdown and DOMPurify utilities.
 *
 * Covers OWASP XSS vectors to verify that renderToHTML and renderToPlainText
 * properly neutralize malicious input. markdown-it with html:false entity-encodes
 * raw HTML, and DOMPurify provides a second layer of sanitization.
 *
 * The key security invariant: no executable script/event handler code survives
 * in the output, whether via stripping or entity-encoding.
 */

import { describe, expect, it } from "vitest";
import { renderToHTML, renderToPlainText } from "@/utilities/markdown";

/**
 * Verifies the output does not contain executable dangerous patterns.
 * Entity-encoded versions (e.g. &lt;script&gt;) are safe and allowed.
 * We parse the HTML to check for actual DOM-level threats.
 */
function assertNoExecutableXSS(html: string): void {
  // No raw <script> tags (entity-encoded &lt;script&gt; is safe)
  expect(html).not.toMatch(/<script[\s>]/i);
  // No raw javascript: URIs in href attributes
  expect(html).not.toMatch(/href\s*=\s*["']javascript:/i);
  // Parse via DOMParser to check for event handler attributes in actual DOM
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allElements = doc.body.querySelectorAll("*");
  for (const el of allElements) {
    for (const attr of el.attributes) {
      expect(attr.name).not.toMatch(/^on/i);
    }
  }
}

describe("XSS sanitization — renderToHTML", () => {
  it("neutralizes <script>alert(1)</script> — no executable script in output", () => {
    const result = renderToHTML("<script>alert(1)</script>");
    assertNoExecutableXSS(result);
  });

  it("neutralizes <img onerror> — no executable event handler in output", () => {
    const result = renderToHTML('<img onerror="alert(1)" src=x>');
    assertNoExecutableXSS(result);
  });

  it("neutralizes javascript: URI in markdown links", () => {
    const result = renderToHTML("[click](javascript:alert(1))");
    assertNoExecutableXSS(result);
  });

  it("neutralizes SVG onload event handlers", () => {
    const result = renderToHTML('<svg onload="alert(1)"></svg>');
    assertNoExecutableXSS(result);
  });

  it("blocks mutation XSS patterns (noscript trick)", () => {
    const payload = '<noscript><p title="</noscript><img src=x onerror=alert(1)>">';
    const result = renderToHTML(payload);
    assertNoExecutableXSS(result);
  });

  it("neutralizes event handlers from arbitrary HTML elements", () => {
    const result = renderToHTML('<div onmouseover="alert(1)">hover</div>');
    assertNoExecutableXSS(result);
  });

  it("neutralizes nested HTML injection in markdown context", () => {
    const markdown = '# Title\n\nSome text <iframe src="evil.com"></iframe> more text';
    const result = renderToHTML(markdown);
    // iframe is either stripped or entity-encoded
    expect(result).not.toMatch(/<iframe[\s>]/i);
    // The normal content survives
    expect(result).toContain("Title");
  });

  it("preserves safe markdown rendering while neutralizing dangerous content", () => {
    const markdown = "**bold** and *italic* and [link](https://safe.com)";
    const result = renderToHTML(markdown);
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>italic</em>");
    expect(result).toContain('href="https://safe.com"');
    assertNoExecutableXSS(result);
  });
});

describe("XSS sanitization — renderToPlainText", () => {
  it("strips all HTML tags returning plain text only", () => {
    const result = renderToPlainText("**bold** and *italic*");
    // No HTML tags in output
    expect(result).not.toMatch(/<[a-z]/i);
    expect(result).toContain("bold");
    expect(result).toContain("italic");
  });

  it("handles empty string input without crashing", () => {
    const result = renderToPlainText("");
    expect(result).toBe("");
  });

  it("neutralizes script tags — no executable code in plain text output", () => {
    const result = renderToPlainText('<script>alert("xss")</script>Normal text');
    // The key assertion: no raw <script> tag survives
    expect(result).not.toMatch(/<script/i);
    expect(result).toContain("Normal text");
  });
});
