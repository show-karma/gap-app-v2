import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotebookViewer } from "@/components/Pages/Communities/Notebooks/NotebookViewer";
import type { NotebookConfig } from "@/services/notebooks.service";
import { useIntersectingObserver } from "../../helpers/intersection-observer";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const NOTEBOOKS_ORIGIN = "https://gap-notebooks.vercel.app";

const notebook: NotebookConfig = {
  id: "cfg-1",
  communityId: "0xfilecoin",
  slug: "grants-overview",
  name: "Grants & milestones overview",
  description: "Grants and milestones across Filecoin programs.",
  artifactUrl: `${NOTEBOOKS_ORIGIN}/filecoin/grants-overview/`,
  artifactVersion: "2026.08.28-1",
  status: "published",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
} as NotebookConfig;

function renderViewer(config: NotebookConfig = notebook) {
  render(<NotebookViewer communityId="filecoin" notebook={config} />);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("NotebookViewer", () => {
  useIntersectingObserver();

  describe("with no notebooks origin configured (the frame is withheld)", () => {
    it("renders the notebook's identity without the frame", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", "");
      renderViewer();

      expect(screen.getByRole("heading", { name: notebook.name })).toBeInTheDocument();
      expect(screen.queryByTitle(notebook.name)).not.toBeInTheDocument();
    });

    // The gate must be visible to a reader, not a blank space that reads as a
    // broken page.
    it("explains that the notebook is not viewable yet", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", "");
      renderViewer();

      expect(screen.getByTestId("notebook-embed-pending")).toBeInTheDocument();
    });

    // The strongest guarantee while withheld: nothing points a frame at a bundle.
    it("renders no iframe at all", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", "");
      renderViewer();

      expect(document.body.querySelectorAll("iframe")).toHaveLength(0);
    });

    it("still shows the version so a rollback is verifiable", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", "");
      renderViewer();

      expect(screen.getByText(/2026\.08\.28-1/)).toBeInTheDocument();
    });

    it("links back to the notebooks list", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", "");
      renderViewer();

      const back = screen.getByRole("link", { name: /all notebooks/i });
      expect(back).toHaveAttribute("href", "/community/filecoin/notebooks");
    });
  });

  describe("with the artifact on the notebooks origin", () => {
    it("renders the sandboxed frame pointed at the artifact", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", NOTEBOOKS_ORIGIN);
      renderViewer();

      const frame = screen.getByTitle(notebook.name);
      expect(frame.tagName).toBe("IFRAME");
      expect(frame).toHaveAttribute("src", notebook.artifactUrl);
    });

    // The invariant holds through the composition, not only in isolation.
    it("keeps the sandbox to allow-scripts through the viewer", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", NOTEBOOKS_ORIGIN);
      renderViewer();

      expect(screen.getByTitle(notebook.name).getAttribute("sandbox")).toBe("allow-scripts");
    });

    it("drops the pending placeholder", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", NOTEBOOKS_ORIGIN);
      renderViewer();

      expect(screen.queryByTestId("notebook-embed-pending")).not.toBeInTheDocument();
    });
  });

  // A config row is admin-authored data, and the API only checks that it is an
  // https URL. Framing is decided here, by exact origin, so a row pointing at
  // any other host — including a lookalike — is withheld, never framed.
  describe("with the artifact anywhere else", () => {
    it.each([
      ["a lookalike origin", "https://fakegap-notebooks.vercel.app/filecoin/grants-overview/"],
      ["the origin as a prefix of another host", "https://gap-notebooks.vercel.app.evil.com/x/"],
      ["the app's own origin", "https://www.karmahq.org/notebooks/filecoin/grants-overview/"],
      [
        "an http URL on the right host",
        "http://gap-notebooks.vercel.app/filecoin/grants-overview/",
      ],
    ])("withholds the frame for %s", (_label, artifactUrl) => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", NOTEBOOKS_ORIGIN);
      renderViewer({ ...notebook, artifactUrl } as NotebookConfig);

      expect(document.body.querySelectorAll("iframe")).toHaveLength(0);
      expect(screen.getByTestId("notebook-embed-pending")).toBeInTheDocument();
    });
  });

  it("omits the description paragraph when there is none", () => {
    vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", "");
    renderViewer({ ...notebook, description: null } as NotebookConfig);

    expect(screen.queryByText(notebook.description!)).not.toBeInTheDocument();
  });
});
