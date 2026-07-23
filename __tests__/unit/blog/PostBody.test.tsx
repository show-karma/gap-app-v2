/**
 * @file `PostBody` block-rendering behavior.
 *
 * Renders each Portable Text block type `sanity/schemas/post.ts` allows in
 * `body` and asserts the resulting DOM shape — never internal serializer
 * wiring or snapshots.
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { BlogBodyBlock } from "@/sanity/lib/types";
import { PostBody } from "@/src/components/blog/PostBody";

describe("PostBody", () => {
  it("renders a heading block as an <h2>", () => {
    const body: BlogBodyBlock[] = [
      {
        _type: "block",
        _key: "heading1",
        style: "h2",
        markDefs: [],
        children: [{ _type: "span", _key: "span1", text: "A heading", marks: [] }],
      },
    ];

    render(<PostBody body={body} />);

    expect(screen.getByRole("heading", { level: 2, name: "A heading" })).toBeInTheDocument();
  });

  it("renders a normal paragraph block", () => {
    const body: BlogBodyBlock[] = [
      {
        _type: "block",
        _key: "p1",
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: "span1", text: "Some prose.", marks: [] }],
      },
    ];

    render(<PostBody body={body} />);

    expect(screen.getByText("Some prose.")).toBeInTheDocument();
  });

  it("renders a bulleted list block as <ul><li>", () => {
    const body: BlogBodyBlock[] = [
      {
        _type: "block",
        _key: "li1",
        style: "normal",
        listItem: "bullet",
        level: 1,
        markDefs: [],
        children: [{ _type: "span", _key: "span1", text: "First item", marks: [] }],
      },
    ];

    render(<PostBody body={body} />);

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
    expect(screen.getByRole("listitem")).toHaveTextContent("First item");
  });

  it("renders a link mark as an <a> with the annotated href", () => {
    const body: BlogBodyBlock[] = [
      {
        _type: "block",
        _key: "link1",
        style: "normal",
        markDefs: [{ _type: "link", _key: "mark1", href: "https://example.com" }],
        children: [{ _type: "span", _key: "span1", text: "a link", marks: ["mark1"] }],
      },
    ];

    render(<PostBody body={body} />);

    expect(screen.getByRole("link", { name: "a link" })).toHaveAttribute(
      "href",
      "https://example.com"
    );
  });

  it("renders a block image with its alt text", () => {
    const body: BlogBodyBlock[] = [
      {
        _type: "blockImage",
        _key: "img1",
        alt: "A scenic mountain view",
        asset: { _ref: "image-mockAsset1-1200x630-png", _type: "reference" },
      },
    ];

    render(<PostBody body={body} />);

    expect(screen.getByAltText("A scenic mountain view")).toBeInTheDocument();
  });

  it("renders the fallback link for a tweet block with a missing id", () => {
    const body: BlogBodyBlock[] = [{ _type: "tweet", _key: "tweet1", tweetId: "" }];

    render(<PostBody body={body} />);

    expect(screen.getByRole("link", { name: /view post on x/i })).toHaveAttribute(
      "href",
      "https://x.com"
    );
  });

  // Resilience against partial/unexpected editor data — these must not throw
  // AND must actually render nothing (an empty body container), not silently
  // emit unexpected content.
  it("renders nothing when body is undefined", () => {
    const { container } = render(<PostBody body={undefined} />);
    const wrapper = container.querySelector(".blog-post-body");
    expect(wrapper).not.toBeNull();
    expect(wrapper).toBeEmptyDOMElement();
  });

  it("renders nothing for an empty body", () => {
    const { container } = render(<PostBody body={[]} />);
    const wrapper = container.querySelector(".blog-post-body");
    expect(wrapper).not.toBeNull();
    expect(wrapper).toBeEmptyDOMElement();
  });

  it("skips a block image that has no uploaded asset", () => {
    const body: BlogBodyBlock[] = [
      { _type: "blockImage", _key: "img1", alt: "alt but no asset" } as BlogBodyBlock,
    ];

    expect(() => render(<PostBody body={body} />)).not.toThrow();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("degrades silently on an unknown block type (no debug text, no throw)", () => {
    const body: BlogBodyBlock[] = [
      { _type: "somethingNew", _key: "x1" } as unknown as BlogBodyBlock,
    ];

    const { container } = render(<PostBody body={body} />);
    expect(container.textContent ?? "").not.toMatch(/unknown/i);
  });
});
