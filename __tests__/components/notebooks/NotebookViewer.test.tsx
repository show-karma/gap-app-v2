import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NotebookConfig } from "@/services/notebooks.service";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const notebook: NotebookConfig = {
  id: "cfg-1",
  communityId: "0xfilecoin",
  slug: "grants-overview",
  name: "Grants & milestones overview",
  description: "Grants and milestones across Filecoin programs.",
  artifactUrl: "https://app.karmahq.org/notebooks/filecoin/grants-overview/index.html",
  artifactVersion: "2026.08.28-1",
  status: "published",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
} as NotebookConfig;

async function renderViewer(embedEnabled: boolean) {
  vi.resetModules();
  vi.doMock("@/utilities/notebooks-gate", () => ({ NOTEBOOK_EMBED_ENABLED: embedEnabled }));
  const { NotebookViewer } = await import(
    "@/components/Pages/Communities/Notebooks/NotebookViewer"
  );
  render(<NotebookViewer communityId="filecoin" notebook={notebook} />);
}

describe("NotebookViewer", () => {
  describe("with the embed gate closed (current state)", () => {
    it("renders the notebook's identity without the frame", async () => {
      await renderViewer(false);

      expect(screen.getByRole("heading", { name: notebook.name })).toBeInTheDocument();
      expect(screen.queryByTitle(notebook.name)).not.toBeInTheDocument();
    });

    // The gate must be visible to a reader, not a blank space that reads as a
    // broken page.
    it("explains that the notebook is not viewable yet", async () => {
      await renderViewer(false);

      expect(screen.getByTestId("notebook-embed-pending")).toBeInTheDocument();
    });

    // The strongest guarantee while gated: nothing points a frame at a bundle.
    it("renders no iframe at all", async () => {
      const { container } = { container: document.body };
      await renderViewer(false);

      expect(container.querySelectorAll("iframe")).toHaveLength(0);
    });

    it("still shows the version so a rollback is verifiable", async () => {
      await renderViewer(false);

      expect(screen.getByText(/2026\.08\.28-1/)).toBeInTheDocument();
    });

    it("links back to the notebooks list", async () => {
      await renderViewer(false);

      const back = screen.getByRole("link", { name: /all notebooks/i });
      expect(back).toHaveAttribute("href", "/community/filecoin/notebooks");
    });
  });

  describe("with the embed gate open", () => {
    it("renders the sandboxed frame pointed at the artifact", async () => {
      await renderViewer(true);

      const frame = screen.getByTitle(notebook.name);
      expect(frame.tagName).toBe("IFRAME");
      expect(frame).toHaveAttribute("src", notebook.artifactUrl);
    });

    // The invariant holds through the composition, not only in isolation.
    it("keeps the sandbox to allow-scripts through the viewer", async () => {
      await renderViewer(true);

      expect(screen.getByTitle(notebook.name).getAttribute("sandbox")).toBe("allow-scripts");
    });

    it("drops the pending placeholder", async () => {
      await renderViewer(true);

      expect(screen.queryByTestId("notebook-embed-pending")).not.toBeInTheDocument();
    });
  });

  it("omits the description paragraph when there is none", async () => {
    vi.resetModules();
    vi.doMock("@/utilities/notebooks-gate", () => ({ NOTEBOOK_EMBED_ENABLED: false }));
    const { NotebookViewer } = await import(
      "@/components/Pages/Communities/Notebooks/NotebookViewer"
    );
    render(
      <NotebookViewer
        communityId="filecoin"
        notebook={{ ...notebook, description: null } as NotebookConfig}
      />
    );

    expect(screen.queryByText(notebook.description!)).not.toBeInTheDocument();
  });
});
