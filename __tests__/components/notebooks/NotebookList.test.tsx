import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotebookList } from "@/components/Pages/Communities/Notebooks/NotebookList";
import { NotebooksUnavailable } from "@/components/Pages/Communities/Notebooks/NotebooksUnavailable";
import { NOTEBOOK_SEED_SPEC } from "@/services/notebooks/notebook-seed-spec";
import type { NotebookConfig } from "@/services/notebooks.service";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function makeNotebook(overrides: Partial<NotebookConfig> = {}): NotebookConfig {
  return {
    id: "cfg-1",
    communityId: "0xfilecoin",
    slug: "grants-overview",
    name: "Grants & milestones overview",
    description: "Grants and milestones.",
    spec: NOTEBOOK_SEED_SPEC,
    status: "published",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  } as NotebookConfig;
}

// F6. The page ships zero client JavaScript — the WASM runtime that copy
// described was deliberately removed. User-visible text must not describe an
// architecture that no longer exists.
describe("architecture copy", () => {
  it("does not claim notebooks run in the browser", () => {
    render(<NotebookList communityId="filecoin" notebooks={[]} />);

    expect(screen.queryByText(/runs in your browser/i)).not.toBeInTheDocument();
  });
});

describe("NotebookList", () => {
  it("renders one entry per notebook", () => {
    render(
      <NotebookList
        communityId="filecoin"
        notebooks={[makeNotebook(), makeNotebook({ slug: "second", name: "Second" })]}
      />
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("links each entry to its own page", () => {
    render(<NotebookList communityId="filecoin" notebooks={[makeNotebook()]} />);

    expect(screen.getByRole("link", { name: /grants & milestones overview/i })).toHaveAttribute(
      "href",
      "/community/filecoin/notebooks/grants-overview"
    );
  });

  it("shows the description when present", () => {
    render(<NotebookList communityId="filecoin" notebooks={[makeNotebook()]} />);

    expect(screen.getByText("Grants and milestones.")).toBeInTheDocument();
  });

  it("omits the description when absent rather than rendering an empty line", () => {
    render(
      <NotebookList communityId="filecoin" notebooks={[makeNotebook({ description: null })]} />
    );

    expect(screen.queryByText("Grants and milestones.")).not.toBeInTheDocument();
  });

  // Three states: this is the empty one. Never a bare null.
  describe("empty state", () => {
    it("explains that nothing is published yet", () => {
      render(<NotebookList communityId="filecoin" notebooks={[]} />);

      expect(screen.getByText(/no notebooks published yet/i)).toBeInTheDocument();
    });

    it("renders no list at all", () => {
      render(<NotebookList communityId="filecoin" notebooks={[]} />);

      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });
});

describe("NotebooksUnavailable", () => {
  it("names the community rather than claiming it does not exist", () => {
    render(<NotebooksUnavailable communityId="optimism" communityName="Optimism" />);

    expect(screen.getByText(/optimism hasn't enabled notebooks/i)).toBeInTheDocument();
  });

  // The (cover) group renders no navigator, so this link is the only way out.
  it("offers a way back to the community", () => {
    render(<NotebooksUnavailable communityId="optimism" communityName="Optimism" />);

    expect(screen.getByRole("link", { name: /back to optimism/i })).toHaveAttribute(
      "href",
      "/community/optimism"
    );
  });
});
