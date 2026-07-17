import { configure, render, screen, waitFor } from "@testing-library/react";
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
    it("demotes markdown h1 to h2 so embedded previews never mint page headings", async () => {
      const { container } = render(<MarkdownPreview source={"# Big Title"} />);

      await waitFor(
        () => {
          expect(screen.getByText("Big Title")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
      expect(container.querySelectorAll("h1")).toHaveLength(0);
      expect(container.querySelector("h2")?.textContent).toBe("Big Title");
    });

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
      render(<MarkdownPreview source="hello" />);

      await waitFor(() => {
        expect(screen.getByText("hello")).toBeInTheDocument();
      });
    });
  });

  describe("excerpt variant (#1481)", () => {
    it("renders links as inert spans, not anchors", async () => {
      const { container } = render(
        <MarkdownPreview variant="excerpt" source="See [the docs](https://example.com) here." />
      );

      await waitFor(
        () => {
          expect(container.querySelector(".wmdeMarkdown")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(container.querySelector("a")).not.toBeInTheDocument();
      expect(screen.getByText("the docs").tagName.toLowerCase()).toBe("span");
    });

    it("renders no buttons for code blocks, images, or tables", async () => {
      const source = [
        "```ts",
        "const x = 1;",
        "```",
        "",
        "![alt text](https://example.com/x.png)",
        "",
        "| A | B |",
        "| - | - |",
        "| 1 | 2 |",
      ].join("\n");

      const { container } = render(<MarkdownPreview variant="excerpt" source={source} />);

      await waitFor(
        () => {
          expect(container.querySelector(".wmdeMarkdown")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(container.querySelectorAll("button").length).toBe(0);
      expect(container.querySelector("img")).not.toBeInTheDocument();
    });

    it("renders markdown headings as paragraphs, not heading elements", async () => {
      const { container } = render(
        <MarkdownPreview variant="excerpt" source={"# Big heading\n\nbody text"} />
      );

      await waitFor(
        () => {
          expect(container.querySelector(".wmdeMarkdown")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(container.querySelector("h1, h2, h3, h4, h5, h6")).not.toBeInTheDocument();
      expect(screen.getByText("Big heading").tagName.toLowerCase()).toBe("p");
    });

    it("truncates long source at a word boundary before parsing", async () => {
      const longWord = "word ".repeat(400); // ~2000 chars
      const { container } = render(<MarkdownPreview variant="excerpt" source={longWord} />);

      // The plain-text fallback paints first and already reflects the truncated
      // source, so we can assert on its length without waiting for streamdown.
      const rendered = container.textContent ?? "";
      expect(rendered.length).toBeLessThan(longWord.length);
      expect(rendered.length).toBeLessThanOrEqual(520); // 500 + ellipsis slack
      expect(rendered.trimEnd().endsWith("…")).toBe(true);
    });

    it("does not truncate short source", () => {
      const { container } = render(
        <MarkdownPreview variant="excerpt" source="A short description." />
      );
      expect(container.textContent).toContain("A short description.");
      expect(container.textContent).not.toContain("…");
    });
  });

  describe("style forwarding (#1278)", () => {
    // Regression: before the prop contract was closed, MarkdownPreview carried a
    // `[key: string]: unknown` index signature and never read `style`, so call
    // sites (chat bubbles, project cards) passing inline `style` had it silently
    // dropped. `style` is now a declared, forwarded prop.
    it("forwards style to the plain-text fallback wrapper", () => {
      const { container } = render(
        <MarkdownPreview source="hello" style={{ color: "rgb(255, 255, 255)" }} />
      );
      const wrapper = container.querySelector(".preview") as HTMLElement;
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.style.color).toBe("rgb(255, 255, 255)");
    });

    it("forwards style to the rendered wrapper after streamdown loads", async () => {
      const { container } = render(
        <MarkdownPreview source="hello" style={{ backgroundColor: "transparent" }} />
      );
      await waitFor(() => {
        const wrapper = container.querySelector('[data-color-mode="light"]') as HTMLElement;
        expect(wrapper).toBeInTheDocument();
        expect(wrapper.style.backgroundColor).toBe("transparent");
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
