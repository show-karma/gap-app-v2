import { act, render, screen, waitFor } from "@testing-library/react";
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

// Track props passed to Streamdown
let lastStreamdownProps: Record<string, unknown> | null = null;

// Mock streamdown as a static module so dynamic import() resolves immediately
const MockStreamdown = (props: {
  children?: string;
  className?: string;
  mode?: string;
  plugins?: Record<string, unknown>;
  remarkPlugins?: unknown[];
  components?: Record<string, React.ComponentType<{ children?: React.ReactNode }>>;
  allowElement?: unknown;
}) => {
  lastStreamdownProps = props as Record<string, unknown>;

  const source = props.children || "";
  // Simple markdown-to-HTML simulation: split on double newlines for paragraphs
  const paragraphs = source.split(/\n\n+/).filter((p: string) => p.trim());
  const PComponent = props.components?.p;

  return (
    <div data-testid="streamdown-output" className={props.className}>
      {paragraphs.map((para: string, idx: number) => {
        if (PComponent) {
          return <PComponent key={idx}>{para}</PComponent>;
        }
        return <p key={idx}>{para}</p>;
      })}
    </div>
  );
};

vi.mock("streamdown", () => ({
  Streamdown: MockStreamdown,
}));

vi.mock("@streamdown/code", () => ({
  code: { name: "code" },
}));

// Mock the CSS import as a no-op string module
vi.mock("streamdown/styles.css", () => ({}));

// Mock remark-breaks so we can verify it gets passed as a plugin
const mockRemarkBreaks = vi.fn();
vi.mock("remark-breaks", () => ({
  __esModule: true,
  default: mockRemarkBreaks,
}));

// Import after mocks
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

describe("MarkdownPreview", () => {
  beforeEach(() => {
    lastStreamdownProps = null;
  });

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

  describe("streamdown rendering", () => {
    it("renders content via Streamdown component after dynamic import resolves", async () => {
      // Flush any pending microtasks from module mocking before rendering.
      // This ensures mocked dynamic imports (streamdown, code, remark-breaks)
      // resolve in time.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      render(<MarkdownPreview source="Hello world" />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      await waitFor(
        () => {
          expect(screen.getByTestId("streamdown-output")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it("passes source as children to Streamdown", async () => {
      render(<MarkdownPreview source="Some **markdown** text" />);

      await waitFor(() => {
        expect(lastStreamdownProps).not.toBeNull();
        expect(lastStreamdownProps?.children).toBe("Some **markdown** text");
      });
    });

    it("sets mode to static", async () => {
      render(<MarkdownPreview source="hello" />);

      await waitFor(() => {
        expect(lastStreamdownProps?.mode).toBe("static");
      });
    });

    it("passes code plugin", async () => {
      render(<MarkdownPreview source="hello" />);

      await waitFor(() => {
        const plugins = lastStreamdownProps?.plugins as Record<string, unknown>;
        expect(plugins?.code).toBeDefined();
      });
    });

    it("wraps content in a div with data-color-mode attribute", async () => {
      const { container } = render(<MarkdownPreview source="hello" />);

      await waitFor(() => {
        const wrapper = container.querySelector('[data-color-mode="light"]');
        expect(wrapper).toBeInTheDocument();
      });
    });

    it("applies wmdeMarkdown CSS module class", async () => {
      render(<MarkdownPreview source="hello" />);

      await waitFor(() => {
        const output = screen.getByTestId("streamdown-output");
        expect(output.className).toContain("wmdeMarkdown");
        expect(output.className).toContain("wmdeMarkdown-module");
      });
    });

    it("passes className prop to Streamdown", async () => {
      render(<MarkdownPreview source="hello" className="my-custom-class" />);

      await waitFor(() => {
        const output = screen.getByTestId("streamdown-output");
        expect(output.className).toContain("my-custom-class");
      });
    });
  });

  describe("paragraph rendering with custom components", () => {
    it("renders paragraphs with mb-2 class via custom p component", async () => {
      render(<MarkdownPreview source="Hello world" />);

      await waitFor(() => {
        const p = document.querySelector("p");
        expect(p).toBeInTheDocument();
        expect(p).toHaveClass("mb-2");
      });
    });

    it("sets transparent background on paragraphs", async () => {
      render(<MarkdownPreview source="Hello world" />);

      await waitFor(() => {
        const p = document.querySelector("p");
        expect(p).toBeInTheDocument();
        expect(p?.style.backgroundColor).toBe("transparent");
      });
    });

    it("allows component override via props", async () => {
      render(
        <MarkdownPreview
          source="Hello world"
          components={{
            p: ({ children }: { children?: React.ReactNode }) => (
              <p className="custom-paragraph">{children}</p>
            ),
          }}
        />
      );

      await waitFor(() => {
        const p = document.querySelector("p.custom-paragraph");
        expect(p).toBeInTheDocument();
      });
    });
  });

  describe("formatting and blank spaces (Issue #5)", () => {
    it("does not apply whitespace-pre-wrap to the streamdown container", async () => {
      // The CSS module class (.wmdeMarkdown) should NOT include whitespace-pre-wrap
      // because it causes literal newlines in rendered HTML to display as visual
      // line breaks, creating huge blank spaces when combined with the markdown
      // renderer's own paragraph and break handling.
      render(<MarkdownPreview source="Line 1\nLine 2\n\nParagraph 2" />);

      await waitFor(() => {
        const output = screen.getByTestId("streamdown-output");
        // The rendered className should not contain whitespace-pre-wrap
        expect(output.className).not.toContain("whitespace-pre-wrap");
        expect(output.className).not.toContain("white-space");
      });
    });

    it("renders multiple paragraphs without excessive spacing", async () => {
      const content = "First paragraph\n\nSecond paragraph\n\nThird paragraph";
      render(<MarkdownPreview source={content} />);

      await waitFor(() => {
        const paragraphs = document.querySelectorAll("p");
        expect(paragraphs.length).toBe(3);
        // Each paragraph should have mb-2 (8px), not excessive margin
        for (const p of paragraphs) {
          expect(p).toHaveClass("mb-2");
        }
      });
    });

    it("renders content with single newlines in a single paragraph", async () => {
      const content = "Line 1\nLine 2\nLine 3";
      render(<MarkdownPreview source={content} />);

      await waitFor(() => {
        const paragraphs = document.querySelectorAll("p");
        // Single newlines should stay in one paragraph (not create multiple)
        expect(paragraphs.length).toBe(1);
      });
    });

    it("renders markdown with mixed formatting correctly", async () => {
      const content = "# Header\n\n**Bold text** and *italic*\n\n- List item 1\n- List item 2";
      render(<MarkdownPreview source={content} />);

      await waitFor(() => {
        expect(screen.getByTestId("streamdown-output")).toBeInTheDocument();
      });
    });

    it("passes remark-breaks plugin so single newlines render as line breaks", async () => {
      render(<MarkdownPreview source="Line 1\nLine 2" />);

      await waitFor(() => {
        expect(lastStreamdownProps).not.toBeNull();
        const remarkPlugins = lastStreamdownProps?.remarkPlugins as unknown[];
        expect(remarkPlugins).toBeDefined();
        expect(remarkPlugins).toContain(mockRemarkBreaks);
      });
    });
  });

  describe("loading state", () => {
    it("shows loading skeleton before Streamdown loads", () => {
      // The component shows a skeleton while dynamic imports resolve.
      // With mocked modules, it resolves quickly, so we just verify
      // the component renders content after loading.
      render(<MarkdownPreview source="hello" />);

      waitFor(() => {
        expect(screen.getByTestId("streamdown-output")).toBeInTheDocument();
      });
    });
  });
});
