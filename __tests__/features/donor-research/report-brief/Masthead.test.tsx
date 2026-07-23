import { render, screen } from "@testing-library/react";
import type { ResearchReportDetail } from "@/types/donor-research";

vi.mock("@/src/features/donor-research/components/report-viewer/WeightsPanel", () => ({
  WeightsPanel: vi.fn(() => <div>Adjust ranking</div>),
}));
vi.mock("@/src/features/donor-research/components/report-viewer/ShareTokenControls", () => ({
  ShareTokenControls: vi.fn(() => <div>Share</div>),
}));

import { Masthead } from "@/src/features/donor-research/components/report-brief/Masthead";

function createReport(overrides: Partial<ResearchReportDetail> = {}): ResearchReportDetail {
  return {
    id: "report-1",
    status: "fast_complete",
    mode: "fast",
    hasShareToken: false,
    shareToken: null,
    shareTokenExpiresAt: null,
    weights: { mission: 2500, activity: 2500, compliance: 2500, recency: 2500 },
    candidates: [{ id: "cand-1" }],
    ...overrides,
  } as unknown as ResearchReportDetail;
}

function renderMasthead(props: Partial<React.ComponentProps<typeof Masthead>> = {}) {
  return render(
    <Masthead
      candidatesCount={5}
      isTerminal={true}
      report={createReport()}
      surfacedCount={3}
      variant="advisor"
      {...props}
    />
  );
}

describe("Masthead manage controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows ranking and share controls for staff (canManageReport)", () => {
    renderMasthead({ variant: "staff", canManageReport: true });

    expect(screen.getByText("Adjust ranking")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("shows controls for the owner by default when canManageReport is unset", () => {
    renderMasthead({ variant: "advisor", canManageReport: undefined });

    expect(screen.getByText("Adjust ranking")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("hides controls on the shared read-only document", () => {
    renderMasthead({ variant: "shared", canManageReport: undefined });

    expect(screen.queryByText("Adjust ranking")).not.toBeInTheDocument();
    expect(screen.queryByText("Share")).not.toBeInTheDocument();
  });

  it("hides controls for a non-owner non-staff viewer even on the staff variant", () => {
    renderMasthead({ variant: "staff", canManageReport: false });

    expect(screen.queryByText("Adjust ranking")).not.toBeInTheDocument();
    expect(screen.queryByText("Share")).not.toBeInTheDocument();
  });

  it("hides controls until the report reaches a terminal status", () => {
    renderMasthead({ variant: "staff", canManageReport: true, isTerminal: false });

    expect(screen.queryByText("Adjust ranking")).not.toBeInTheDocument();
    expect(screen.queryByText("Share")).not.toBeInTheDocument();
  });
});
