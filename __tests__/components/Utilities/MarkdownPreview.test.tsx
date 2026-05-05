import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

// Mock CSS module
vi.mock("@/styles/markdown.module.css", () => ({
  default: { wmdeMarkdown: "wmdeMarkdown-module" },
  wmdeMarkdown: "wmdeMarkdown-module",
}));

// Mock streamdown styles (CSS-only, no-op in tests)
vi.mock("streamdown/styles.css", () => ({}));

// Import after mocks
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

describe("MarkdownPreview", () => {
  describe("empty/undefined source handling", () => {
    it("returns null when source is undefined", () => {
      const { container } = render(<MarkdownPreview source={undefined} />);
      expect(container.innerHTML).toBe("");
    });

    it("returns null when source is empty string", () => {
      const { container } = render(<MarkdownPreview source="" />);
      expect(container.innerHTML).toBe("");
    });
  });

  describe("loading state", () => {
    it("renders without crashing for non-empty source", () => {
      const { container } = render(<MarkdownPreview source="hello" />);
      expect(container.innerHTML).not.toBe("");
    });
  });

  describe("streamdown rendering", () => {
    it("renders markdown content after streamdown loads", async () => {
      render(<MarkdownPreview source="Hello world" />);

      await waitFor(
        () => {
          expect(screen.getByText("Hello world")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("wraps content in a div with data-color-mode attribute", async () => {
      const { container } = render(<MarkdownPreview source="hello" />);

      await waitFor(() => {
        const wrapper = container.querySelector('[data-color-mode="light"]');
        expect(wrapper).toBeInTheDocument();
      });
    });

    it("applies CSS module class via className", async () => {
      const { container } = render(<MarkdownPreview source="hello" />);

      await waitFor(() => {
        const el = container.querySelector(".wmdeMarkdown");
        expect(el).toBeInTheDocument();
        expect(el).toHaveClass("wmdeMarkdown-module");
      });
    });

    it("passes custom className prop through to the rendered element", async () => {
      const { container } = render(<MarkdownPreview source="hello" className="my-custom-class" />);

      await waitFor(() => {
        const el = container.querySelector(".my-custom-class");
        expect(el).toBeInTheDocument();
      });
    });

    it("renders bold text from markdown", async () => {
      render(<MarkdownPreview source="This is **bold** text" />);

      await waitFor(() => {
        expect(screen.getByText("bold")).toBeInTheDocument();
      });
    });

    it("renders links from markdown", async () => {
      render(<MarkdownPreview source="[Click here](https://example.com)" />);

      await waitFor(() => {
        const link = document.querySelector('[data-streamdown="link"]');
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent("Click here");
      });
    });

    it("renders with mode='static' (no streaming animation)", async () => {
      const { container } = render(<MarkdownPreview source="hello" />);

      await waitFor(() => {
        expect(screen.getByText("hello")).toBeInTheDocument();
      });
    });
  });

  describe("custom components", () => {
    it("applies default paragraph component with mb-2 class", async () => {
      render(<MarkdownPreview source="A paragraph" />);

      await waitFor(() => {
        const p = document.querySelector("p.mb-2");
        expect(p).toBeInTheDocument();
      });
    });

    it("default paragraph has transparent background and currentColor", async () => {
      render(<MarkdownPreview source="A paragraph" />);

      await waitFor(() => {
        const p = document.querySelector("p.mb-2") as HTMLElement;
        expect(p).toBeInTheDocument();
        expect(p.style.backgroundColor).toBe("transparent");
        expect(p.style.color).toBe("currentColor");
      });
    });
  });
});
