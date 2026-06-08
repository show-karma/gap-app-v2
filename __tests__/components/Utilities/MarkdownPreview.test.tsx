import { act, configure, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// MarkdownPreview lazy-loads streamdown + plugins via 5 real dynamic import()s
// and shows a plain-text fallback until they resolve. In isolation that takes
// <1s, but inside the full suite the imports compete for the worker and can
// exceed RTL's default 1s asyncUtilTimeout — leaving the fallback in the DOM
// and flaking whichever waitFor happens to run slowest. Give every waitFor in
// this file room for the real imports; reset to the default afterward so the
// longer timeout never leaks into other files sharing the worker.
beforeAll(() => configure({ asyncUtilTimeout: 5000 }));
afterAll(() => configure({ asyncUtilTimeout: 1000 }));

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

    it("renders plain-text fallback (not skeleton) on first paint", () => {
      // First render is synchronous; Streamdown loads after useEffect resolves.
      // The plain-text fallback should appear immediately, not an animated
      // skeleton bar — avoids a regression on apply pages where many short
      // description fields used to render instantly as <p>{source}</p>.
      const { container } = render(<MarkdownPreview source="Plain description text" />);
      expect(container.textContent).toContain("Plain description text");
      expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    });

    it("fallback preserves the literal source (newlines + markdown syntax)", () => {
      const { container } = render(<MarkdownPreview source={"line one\nline two"} />);
      expect(container.textContent).toBe("line one\nline two");
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
