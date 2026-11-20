import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HtmlReportFrame } from "@/components/Pages/Community/PortfolioReports/HtmlReportFrame";

function renderReport(body: string, head = ""): ShadowRoot {
  const { container } = render(
    <HtmlReportFrame
      title="Report"
      html={`<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`}
    />
  );
  const root = container.querySelector("section")?.shadowRoot;
  if (!root) throw new Error("shadow root not attached");
  return root;
}

describe("HtmlReportFrame sanitization", () => {
  it.each([
    [
      "attribute clobbering that hid event handlers from the old sanitizer",
      '<style>@keyframes x{}</style><form style="animation-name:x" onanimationstart="alert(1)"><input name="attributes"></form>',
    ],
    ["a javascript: form action", '<form action="javascript:alert(1)"><button>go</button></form>'],
    ["a javascript: link split by a control character", '<a href="java&#10;script:alert(1)">x</a>'],
    ["an image error handler", '<img src="x" onerror="alert(1)">'],
    ["an inline script", "<script>alert(1)</script><p>ok</p>"],
    ["an svg onload handler", '<svg onload="alert(1)"><circle r="1"/></svg>'],
    ["an iframe", '<iframe src="https://evil.example"></iframe>'],
  ])("removes %s", (_name, payload) => {
    const html = renderReport(payload).innerHTML.toLowerCase();

    expect(html).not.toMatch(/\son[a-z]+\s*=/);
    expect(html).not.toContain("script:");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<iframe");
  });

  it("keeps report markup, inline styles and the report stylesheet", () => {
    const root = renderReport(
      '<h1 style="color: red">Title</h1><table><tr><td>1</td></tr></table>',
      "<style>body { margin: 0 } h1 { font-size: 2rem }</style>"
    );

    expect(root.querySelector("h1")?.textContent).toBe("Title");
    expect(root.querySelector("h1")?.getAttribute("style")).toContain("color");
    expect(root.querySelector("td")?.textContent).toBe("1");
    expect(root.querySelector("style")?.textContent).toContain(":host");
  });

  it("keeps the web-font stylesheet and drops any other external stylesheet", () => {
    const root = renderReport(
      "<p>ok</p>",
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"><link rel="stylesheet" href="https://evil.example/exfil.css">'
    );

    const hrefs = Array.from(root.querySelectorAll("link"), (link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["https://fonts.googleapis.com/css2?family=Inter"]);
  });
});
