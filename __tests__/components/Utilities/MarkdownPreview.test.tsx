import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

// Mock CSS module
jest.mock("@/styles/markdown.module.css", () => ({
  wmdeMarkdown: "wmdeMarkdown-module",
}));

// Mock renderToHTML from utilities/markdown
jest.mock("@/utilities/markdown", () => ({
  renderToHTML: jest.fn((source: string) => `<p>${source}</p>`),
}));

// Track whether HeavyPreview was rendered
let heavyPreviewRendered = false;

// Mock next/dynamic to return a trackable heavy preview component
jest.mock("next/dynamic", () => {
  return function mockDynamic() {
    const MockHeavyPreview = (props: {
      source?: string;
      className?: string;
      components?: {
        p?: (props: { children: React.ReactNode }) => React.ReactElement;
        code?: (props: { children: React.ReactNode; className?: string }) => React.ReactElement;
      };
      [key: string]: unknown;
    }) => {
      heavyPreviewRendered = true;
      return (
        <div data-testid="heavy-markdown-preview" className={props.className}>
          {props.components?.p && props.components.p({ children: <span>test paragraph</span> })}
          {props.components?.code &&
            props.components.code({
              children: "const x = 1;",
              className: "language-js",
            })}
        </div>
      );
    };
    return MockHeavyPreview;
  };
});

// Import after mocks
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { renderToHTML } from "@/utilities/markdown";

describe("MarkdownPreview", () => {
  beforeEach(() => {
    heavyPreviewRendered = false;
    (renderToHTML as jest.Mock).mockClear();
  });

  describe("routing: lite vs heavy renderer", () => {
    it("uses lite renderer for plain prose (no code fences)", async () => {
      render(<MarkdownPreview source="Hello world, this is plain text." />);

      await waitFor(() => {
        expect(renderToHTML).toHaveBeenCalledWith("Hello world, this is plain text.");
      });
      expect(heavyPreviewRendered).toBe(false);
    });

    it("uses lite renderer for content with unfenced code blocks (no language tag)", async () => {
      const source = "Here is some code:\n```\nconsole.log('hi')\n```";
      render(<MarkdownPreview source={source} />);

      await waitFor(() => {
        expect(renderToHTML).toHaveBeenCalledWith(source);
      });
      expect(heavyPreviewRendered).toBe(false);
    });

    it("uses heavy renderer for content with fenced code blocks with language tags", () => {
      const source = "Here is some code:\n```javascript\nconsole.log('hi')\n```";
      render(<MarkdownPreview source={source} />);

      expect(renderToHTML).not.toHaveBeenCalled();
      expect(heavyPreviewRendered).toBe(true);
    });

    it("uses heavy renderer for ```python code fences", () => {
      const source = "```python\nprint('hello')\n```";
      render(<MarkdownPreview source={source} />);

      expect(heavyPreviewRendered).toBe(true);
    });

    it("uses heavy renderer for ```ts code fences", () => {
      const source = "Some text\n```ts\nconst x: number = 1;\n```";
      render(<MarkdownPreview source={source} />);

      expect(heavyPreviewRendered).toBe(true);
    });
  });

  describe("empty/undefined source handling", () => {
    it("returns null when source is undefined", () => {
      const { container } = render(<MarkdownPreview source={undefined} />);

      expect(container.innerHTML).toBe("");
      expect(heavyPreviewRendered).toBe(false);
    });

    it("returns null when source is empty string", () => {
      const { container } = render(<MarkdownPreview source="" />);

      expect(container.innerHTML).toBe("");
      expect(heavyPreviewRendered).toBe(false);
    });
  });

  describe("lite renderer output", () => {
    it("renders HTML from renderToHTML into the DOM", async () => {
      (renderToHTML as jest.Mock).mockReturnValue("<p>Rendered <strong>markdown</strong></p>");
      render(<MarkdownPreview source="Some **markdown**" />);

      await waitFor(() => {
        expect(screen.getByText("Rendered")).toBeInTheDocument();
      });
      expect(document.querySelector("strong")).toBeInTheDocument();
    });

    it("wraps content in a div with data-color-mode attribute", async () => {
      const { container } = render(<MarkdownPreview source="hello" />);
      await waitFor(() => {
        const wrapper = container.querySelector('[data-color-mode="light"]');
        expect(wrapper).toBeInTheDocument();
      });
    });

    it("applies CSS module class and wmde-markdown class", async () => {
      const { container } = render(<MarkdownPreview source="hello" />);
      await waitFor(() => {
        const innerDiv = container.querySelector(".wmdeMarkdown");
        expect(innerDiv).toBeInTheDocument();
        expect(innerDiv).toHaveClass("wmde-markdown");
        expect(innerDiv).toHaveClass("wmdeMarkdown-module");
      });
    });

    it("passes className prop to the inner div", async () => {
      const { container } = render(<MarkdownPreview source="hello" className="my-custom-class" />);
      await waitFor(() => {
        const innerDiv = container.querySelector(".wmdeMarkdown");
        expect(innerDiv).toHaveClass("my-custom-class");
      });
    });
  });

  describe("heavy renderer (code blocks with language tags)", () => {
    it("renders paragraphs with mb-2 class via components prop", () => {
      render(<MarkdownPreview source="```js\nconst x = 1;\n```" />);
      const p = document.querySelector("p");
      expect(p).toBeInTheDocument();
      expect(p).toHaveClass("mb-2");
    });

    it("preserves language className on code elements", () => {
      render(<MarkdownPreview source="```js\nconst x = 1;\n```" />);
      const code = document.querySelector("code");
      expect(code).toBeInTheDocument();
      expect(code).toHaveClass("language-js");
    });

    it("code element has base styling classes", () => {
      render(<MarkdownPreview source="```js\nconst x = 1;\n```" />);
      const code = document.querySelector("code");
      expect(code).toHaveClass("bg-neutral-200");
      expect(code).toHaveClass("p-2");
      expect(code).toHaveClass("rounded-md");
    });

    it("wraps content in a div with data-color-mode attribute", () => {
      const { container } = render(<MarkdownPreview source="```js\nconst x = 1;\n```" />);
      const wrapper = container.querySelector('[data-color-mode="light"]');
      expect(wrapper).toBeInTheDocument();
    });

    it("does not leak parent className onto code elements", () => {
      render(
        <MarkdownPreview source="```js\nconst x = 1;\n```" className="my-custom-parent-class" />
      );
      const code = document.querySelector("code");
      expect(code).not.toHaveClass("my-custom-parent-class");
    });
  });
});
