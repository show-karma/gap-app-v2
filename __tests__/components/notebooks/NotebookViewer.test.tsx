import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NotebookOverview } from "@/services/notebook-overview.service";
import { NOTEBOOK_SEED_SPEC } from "@/services/notebooks/notebook-seed-spec";
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
  spec: NOTEBOOK_SEED_SPEC,
  status: "published",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
} as NotebookConfig;

function makeOverview(overrides: Partial<NotebookOverview> = {}): NotebookOverview {
  return {
    source: "gap-api",
    stale: false,
    generatedAt: "2026-08-29T01:00:00.000Z",
    currency: "USDC",
    stats: [
      { id: "committed", label: "Committed", value: 9246697, format: "currency" },
      {
        id: "disbursed",
        label: "Disbursed",
        value: 6369766,
        format: "currency",
        hint: "$2.9M still to pay out",
      },
      { id: "fundedProjects", label: "Funded projects", value: 47, format: "count" },
      { id: "milestoneCompletion", label: "Milestone completion", value: 52.7, format: "percent" },
    ],
    funding: [
      {
        label: "Filecoin ProPGF Batch 3",
        value: 0,
        total: 2168267,
        caption: "$0 of $2.2M",
        meta: "18 projects",
      },
    ],
    completion: [{ label: "Kernel", value: 1.3, total: 100, caption: "1.3%", meta: "13 projects" }],
    applications: [{ label: "Approved", value: 52 }],
    ...overrides,
  };
}

async function renderViewer(overview: NotebookOverview, liveRuntime = false) {
  vi.resetModules();
  vi.doMock("@/utilities/notebooks-gate", () => ({
    NOTEBOOK_LIVE_RUNTIME_ENABLED: liveRuntime,
  }));
  const { NotebookViewer } = await import(
    "@/components/Pages/Communities/Notebooks/NotebookViewer"
  );
  render(<NotebookViewer communityId="filecoin" notebook={notebook} overview={overview} />);
}

describe("NotebookViewer (static-first)", () => {
  // The whole point of Architecture B: the numbers are in the server-rendered
  // markup, not produced by a runtime the viewer has to boot.
  it("renders the KPI values directly in the markup", async () => {
    await renderViewer(makeOverview());

    expect(screen.getByText("$9.25M")).toBeInTheDocument();
    expect(screen.getByText("$6.37M")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("52.7%")).toBeInTheDocument();
  });

  it("renders each bar with its value as text, never colour alone", async () => {
    await renderViewer(makeOverview());

    expect(screen.getByText("Filecoin ProPGF Batch 3")).toBeInTheDocument();
    expect(screen.getByText("$0 of $2.2M")).toBeInTheDocument();
    expect(screen.getByText("Kernel")).toBeInTheDocument();
    expect(screen.getByText("1.3%")).toBeInTheDocument();
  });

  // No author markup, no runtime, no frame — this is what dissolves BB1.
  it("renders no iframe at all", async () => {
    await renderViewer(makeOverview());

    expect(document.querySelectorAll("iframe")).toHaveLength(0);
  });

  it("tells the reader when the data was computed", async () => {
    await renderViewer(makeOverview());

    expect(screen.getByText(/Live GAP data/)).toBeInTheDocument();
    expect(screen.getByText(/2026-08-29 01:00 UTC/)).toBeInTheDocument();
  });

  it("labels a snapshot-sourced payload as a snapshot", async () => {
    await renderViewer(makeOverview({ source: "snapshot" }));

    expect(screen.getByText(/Snapshot/)).toBeInTheDocument();
  });

  describe("live-runtime seam (WS-B4)", () => {
    it("is absent while the gate is closed", async () => {
      await renderViewer(makeOverview());

      expect(screen.queryByTestId("notebook-live-runtime-seam")).not.toBeInTheDocument();
    });

    it("mounts only when the gate opens", async () => {
      await renderViewer(makeOverview(), true);

      expect(screen.getByTestId("notebook-live-runtime-seam")).toBeInTheDocument();
    });
  });
});
