import { describe, expect, it } from "vitest";
import { autolinkText, normalizeUrl, remarkAutolinkUrls } from "../lib/remark-autolink-urls";

describe("normalizeUrl", () => {
  it("keeps absolute http(s) urls unchanged", () => {
    expect(normalizeUrl("https://fordfoundation.org/grants")).toBe(
      "https://fordfoundation.org/grants"
    );
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("prepends https to www. and scheme-less domains", () => {
    expect(normalizeUrl("www.macfound.org")).toBe("https://www.macfound.org");
    expect(normalizeUrl("fordfoundation.org")).toBe("https://fordfoundation.org");
    expect(normalizeUrl("knightfoundation.org/programs")).toBe(
      "https://knightfoundation.org/programs"
    );
  });

  it("leaves internal/relative and non-web hrefs untouched", () => {
    expect(normalizeUrl("/nonprofits/find-funders/foundation/123")).toBeNull();
    expect(normalizeUrl("#section")).toBeNull();
    expect(normalizeUrl("mailto:hi@example.org")).toBeNull();
    expect(normalizeUrl("tel:+15551234")).toBeNull();
  });

  it("ignores prose that merely contains a dot", () => {
    expect(normalizeUrl("e.g")).toBeNull();
    expect(normalizeUrl("vs.")).toBeNull();
    expect(normalizeUrl("3.5")).toBeNull();
  });
});

describe("autolinkText", () => {
  it("returns null when there is nothing to link", () => {
    expect(autolinkText("just some plain prose")).toBeNull();
  });

  it("links a scheme-less domain in the middle of a sentence", () => {
    const nodes = autolinkText("See fordfoundation.org for details.");
    expect(nodes).toEqual([
      { type: "text", value: "See " },
      {
        type: "link",
        url: "https://fordfoundation.org",
        children: [{ type: "text", value: "fordfoundation.org" }],
      },
      { type: "text", value: " for details." },
    ]);
  });

  it("does not swallow trailing sentence punctuation into the link", () => {
    const nodes = autolinkText("Apply at macfound.org.");
    expect(nodes?.[1]).toMatchObject({ type: "link", url: "https://macfound.org" });
    expect(nodes?.at(-1)).toEqual({ type: "text", value: "." });
  });

  it("links multiple urls in one string", () => {
    const nodes = autolinkText("a.org and https://b.com");
    const links = nodes?.filter((n) => n.type === "link");
    expect(links).toHaveLength(2);
  });
});

describe("remarkAutolinkUrls plugin", () => {
  function textNode(value: string) {
    return { type: "text", value };
  }

  it("autolinks bare domains inside paragraph text", () => {
    const tree = {
      type: "root",
      children: [{ type: "paragraph", children: [textNode("Visit fordfoundation.org now")] }],
    };
    remarkAutolinkUrls()(tree as never);
    const para = (tree.children[0] as { children: unknown[] }).children;
    expect(para).toEqual([
      { type: "text", value: "Visit " },
      {
        type: "link",
        url: "https://fordfoundation.org",
        children: [{ type: "text", value: "fordfoundation.org" }],
      },
      { type: "text", value: " now" },
    ]);
  });

  it("repairs a scheme-less href on an existing link node", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "link", url: "fordfoundation.org", children: [textNode("Ford Foundation")] },
          ],
        },
      ],
    };
    remarkAutolinkUrls()(tree as never);
    const link = (tree.children[0] as { children: { url: string }[] }).children[0];
    expect(link.url).toBe("https://fordfoundation.org");
  });

  it("never rewrites internal entity links", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "link",
              url: "/nonprofits/find-funders/foundation/123",
              children: [textNode("Ford")],
            },
          ],
        },
      ],
    };
    remarkAutolinkUrls()(tree as never);
    const link = (tree.children[0] as { children: { url: string }[] }).children[0];
    expect(link.url).toBe("/nonprofits/find-funders/foundation/123");
  });

  it("does not autolink inside inline code or code blocks", () => {
    const tree = {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "inlineCode", value: "fordfoundation.org" }] },
        { type: "code", value: "see example.com" },
      ],
    };
    remarkAutolinkUrls()(tree as never);
    const para = (tree.children[0] as { children: { type: string }[] }).children;
    expect(para[0].type).toBe("inlineCode");
    expect((tree.children[1] as { type: string }).type).toBe("code");
  });
});
