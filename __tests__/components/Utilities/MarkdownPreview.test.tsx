import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light" }),
}));

// Mock CSS module
jest.mock("@/styles/markdown.module.css", () => ({
  wmdeMarkdown: "wmdeMarkdown-module",
}));

// Mock next/dynamic to return a component that exercises the `components` prop
jest.mock("next/dynamic", () => {
  return function mockDynamic() {
    const MockPreview = ({
      components,
      className,
    }: {
      components?: {
        p?: (props: { children: React.ReactNode }) => React.ReactElement;
        code?: (props: { children: React.ReactNode; className?: string }) => React.ReactElement;
      };
      className?: string;
      [key: string]: unknown;
    }) => (
      <div data-testid="markdown-preview" className={className}>
        {components?.p && components.p({ children: <span>test paragraph</span> })}
        {components?.code &&
          components.code({
            children: "const x = 1;",
            className: "language-js",
          })}
      </div>
    );
    return MockPreview;
  };
});

// Import after mocks
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

describe("MarkdownPreview", () => {
  describe("paragraph rendering", () => {
    it("renders paragraphs as <p> elements, not <span>", () => {
      render(<MarkdownPreview source="hello world" />);
      const p = document.querySelector("p");
      expect(p).toBeInTheDocument();
      // Confirm it is not a span
      const span = document.querySelector("span.mb-2");
      expect(span).not.toBeInTheDocument();
    });

    it("paragraph has mb-2 class", () => {
      render(<MarkdownPreview source="hello world" />);
      const p = document.querySelector("p");
      expect(p).toHaveClass("mb-2");
    });
  });

  describe("code block rendering", () => {
    it("preserves language className on code elements", () => {
      render(<MarkdownPreview source="```js\nconst x = 1;\n```" />);
      const code = document.querySelector("code");
      expect(code).toBeInTheDocument();
      expect(code).toHaveClass("language-js");
    });

    it("code element has base styling classes", () => {
      render(<MarkdownPreview source="```js\nconst x = 1;\n```" />);
      const code = document.querySelector("code");
      expect(code).toHaveClass("bg-zinc-600");
      expect(code).toHaveClass("p-2");
      expect(code).toHaveClass("rounded-md");
    });
  });

  describe("className isolation", () => {
    it("does not leak parent className onto code elements", () => {
      render(
        <MarkdownPreview source="```js\nconst x = 1;\n```" className="my-custom-parent-class" />
      );
      const code = document.querySelector("code");
      // The code element should NOT carry the parent className
      expect(code).not.toHaveClass("my-custom-parent-class");
    });

    it("parent className goes to the Preview wrapper, not code", () => {
      render(<MarkdownPreview source="```js\nconst x = 1;\n```" className="outer-class" />);
      // The wrapper div contains the preview element with the combined className
      const preview = screen.getByTestId("markdown-preview");
      expect(preview.className).toContain("outer-class");
      // code still should not have it
      const code = document.querySelector("code");
      expect(code).not.toHaveClass("outer-class");
    });
  });

  describe("wrapper structure", () => {
    it("wraps content in a div with data-color-mode attribute", () => {
      const { container } = render(<MarkdownPreview source="hello" />);
      const wrapper = container.querySelector('[data-color-mode="light"]');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
