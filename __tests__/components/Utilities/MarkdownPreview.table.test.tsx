import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@/styles/markdown.module.css", () => ({
  default: { wmdeMarkdown: "wmdeMarkdown-module" },
  wmdeMarkdown: "wmdeMarkdown-module",
}));

vi.mock("streamdown/styles.css", () => ({}));

import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

describe("MarkdownPreview table rendering (regression)", () => {
  it("renders a complete GFM table with header + separator row", async () => {
    const source = `| Name | Org & role | Relationship to project | Contact |
| ---- | ---------- | ----------------------- | ------- |
| Alice | CEO | Investor | alice@ex.com |`;

    const { container } = render(<MarkdownPreview source={source} />);

    await waitFor(
      () => {
        const table = container.querySelector("table");
        expect(table).toBeInTheDocument();
        const headers = container.querySelectorAll("th");
        expect(headers).toHaveLength(4);
      },
      { timeout: 3000 }
    );
  });

  it("auto-completes a header-only table (no separator row)", async () => {
    const source = `| Name | Org & role | Relationship to project | Contact |`;

    const { container } = render(<MarkdownPreview source={source} />);

    await waitFor(
      () => {
        const table = container.querySelector("table");
        expect(table).toBeInTheDocument();
        const headers = container.querySelectorAll("th");
        expect(headers).toHaveLength(4);
      },
      { timeout: 3000 }
    );
  });

  it("does not turn a single inline-pipe sentence into a table", async () => {
    const source = `Use a | between options to separate them.`;

    const { container } = render(<MarkdownPreview source={source} />);

    await waitFor(
      () => {
        const p = container.querySelector("p");
        expect(p).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(container.querySelector("table")).not.toBeInTheDocument();
  });

  it("auto-completes when header is followed by data rows but no separator", async () => {
    const source = `| Name | Role |
| Alice | CEO |
| Bob | CTO |`;

    const { container } = render(<MarkdownPreview source={source} />);

    await waitFor(
      () => {
        const table = container.querySelector("table");
        expect(table).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("auto-completes table separated by paragraph + newline", async () => {
    const source = `Nominate 2-3 metrics — externally verifiable, tied to your milestones.

| Metric | Data source | How it's measured | Target (end of grant) |`;

    const { container } = render(<MarkdownPreview source={source} />);

    await waitFor(
      () => {
        const table = container.querySelector("table");
        expect(table).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
