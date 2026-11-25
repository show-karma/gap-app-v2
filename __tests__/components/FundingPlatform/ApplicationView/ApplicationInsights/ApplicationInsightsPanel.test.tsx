import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationInsightsPanel } from "@/components/FundingPlatform/ApplicationView/ApplicationInsights/ApplicationInsightsPanel";

const trackRecordQuery = vi.fn();
const indicatorQuery = vi.fn();
const integrationsQuery = vi.fn();
const simEvaluationsQuery = vi.fn();
const verdictsQuery = vi.fn();

vi.mock("@/hooks/useApplicationInsights", () => ({
  useApplicationTrackRecord: () => trackRecordQuery(),
  useProjectIndicatorSeries: () => indicatorQuery(),
}));

vi.mock("@/hooks/useSimocracyMilestoneVerdicts", () => ({
  useSimocracyApplicationVerdicts: () => verdictsQuery(),
}));

vi.mock("@/hooks/useApplicationIntegrations", () => ({
  useApplicationIntegrations: () => integrationsQuery(),
  useSimocracyEvaluations: () => simEvaluationsQuery(),
}));

const settled = <T,>(data: T) => ({ data, isPending: false, isError: false, refetch: vi.fn() });

const AVAILABLE = {
  status: "available",
  projectUID: "0xproject",
  project: { uid: "0xproject", slug: "forest", title: "Forest" },
  grants: [
    {
      uid: "batch-2",
      title: "Filecoin ProPGF Batch 2",
      programId: "1479",
      isCompleted: false,
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      totalGrantAmount: "504000",
      tokenSymbol: "USDC",
      tokenAddress: "0xtoken",
      chainID: 1,
      paidAmount: "168840",
      paidTokenSymbol: "USDC",
      paymentCount: 1,
      milestones: [
        {
          uid: "m-1",
          title: "Milestone 1",
          dueDate: "2026-06-30T00:00:00.000Z",
          currentStatus: "verified",
          completedAt: "2026-07-02T00:00:00.000Z",
          completionPercentage: 50,
          allocatedAmount: "168840",
          evaluation: { rating: 5, evaluatedAt: "2026-07-03T00:00:00.000Z" },
          paidAmount: "168840",
          paidAt: "2026-08-26T00:00:00.000Z",
        },
      ],
    },
  ],
};

describe("ApplicationInsightsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indicatorQuery.mockReturnValue(settled([]));
    integrationsQuery.mockReturnValue(settled([{ key: "simocracy", enabled: false }]));
    simEvaluationsQuery.mockReturnValue(settled({ evaluations: [] }));
    verdictsQuery.mockReturnValue(settled({ verdicts: [], forbidden: false }));
  });

  describe("loading", () => {
    it("renders a skeleton while the track record loads", () => {
      trackRecordQuery.mockReturnValue({ isPending: true, isError: false });

      render(<ApplicationInsightsPanel referenceNumber="APP-1" />);

      expect(screen.getByLabelText("Loading insights")).toBeInTheDocument();
    });
  });

  describe("error", () => {
    it("offers a retry when the track record fails", async () => {
      const refetch = vi.fn();
      trackRecordQuery.mockReturnValue({ isPending: false, isError: true, refetch });

      render(<ApplicationInsightsPanel referenceNumber="APP-1" />);
      await userEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe("empty", () => {
    it("says when no Karma project is linked", () => {
      trackRecordQuery.mockReturnValue(
        settled({ status: "no_project_linked", projectUID: null, project: null, grants: [] })
      );

      render(<ApplicationInsightsPanel referenceNumber="APP-1" />);

      expect(screen.getByText("No Karma project linked")).toBeInTheDocument();
    });

    it("names every section that has no data", () => {
      trackRecordQuery.mockReturnValue(settled({ ...AVAILABLE, grants: [] }));

      render(<ApplicationInsightsPanel referenceNumber="APP-1" />);

      expect(screen.getByText("No previous grants on Karma")).toBeInTheDocument();
      expect(screen.getByText("No committed metrics")).toBeInTheDocument();
      expect(screen.getByText("No indicators reported yet")).toBeInTheDocument();
      expect(screen.getByText("Simocracy is not enabled for this program")).toBeInTheDocument();
    });
  });

  describe("success", () => {
    it("collapses and expands a grant's milestones from its row", async () => {
      trackRecordQuery.mockReturnValue(settled(AVAILABLE));
      render(<ApplicationInsightsPanel referenceNumber="APP-1" />);
      const grantRow = screen.getByRole("button", { name: /Filecoin ProPGF Batch 2/ });

      expect(grantRow).toHaveAttribute("aria-expanded", "true");
      await userEvent.click(grantRow);

      expect(grantRow).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Milestone 1")).not.toBeInTheDocument();
      expect(screen.getByText("1 of 1 delivered")).toBeInTheDocument();
    });

    it("does not show a zero payout entry as a payment", () => {
      const zeroPaid = structuredClone(AVAILABLE);
      zeroPaid.grants[0].milestones[0].paidAmount = "0";
      trackRecordQuery.mockReturnValue(settled(zeroPaid));

      render(<ApplicationInsightsPanel referenceNumber="APP-1" />);

      expect(screen.queryByText("0 USDC")).not.toBeInTheDocument();
      expect(screen.queryByText(/after verified/)).not.toBeInTheDocument();
    });

    it("shows the approved total with its token and the late delivery", () => {
      trackRecordQuery.mockReturnValue(settled(AVAILABLE));

      render(<ApplicationInsightsPanel referenceNumber="APP-1" />);

      expect(screen.getByText("504K USDC")).toBeInTheDocument();
      expect(screen.getByText("34% paid · across 1 grant")).toBeInTheDocument();
      expect(screen.getByText(/Aug 26 · 55 days after verified/)).toBeInTheDocument();
      expect(screen.getByText("Not allocated to a milestone")).toBeInTheDocument();
      expect(screen.getByText("1 delivered after the due date")).toBeInTheDocument();
      expect(screen.getByText(/2 days after due date/)).toBeInTheDocument();
      expect(screen.getByText("5 / 10")).toBeInTheDocument();
    });

    it("shows pending Sim verdicts on the application and hides dismissed ones", () => {
      trackRecordQuery.mockReturnValue(settled(AVAILABLE));
      integrationsQuery.mockReturnValue(settled([{ key: "simocracy", enabled: true }]));
      verdictsQuery.mockReturnValue(
        settled({
          forbidden: false,
          verdicts: [
            {
              verdictId: "v-1",
              simName: "Eva AI",
              text: "Recommend: the arithmetic is clean.",
              status: "pending_review",
              updatedAt: "2026-11-24T00:00:00.000Z",
            },
            {
              verdictId: "v-2",
              simName: "Old Sim",
              text: "Dismissed draft",
              status: "dismissed",
              updatedAt: null,
            },
          ],
        })
      );

      render(<ApplicationInsightsPanel referenceNumber="APP-1" />);

      expect(screen.getByText("Eva AI")).toBeInTheDocument();
      expect(screen.getByText("Pending review")).toBeInTheDocument();
      expect(screen.getByText("1 Sim review · 1 pending review")).toBeInTheDocument();
      expect(screen.queryByText("Old Sim")).not.toBeInTheDocument();
    });

    it("labels each committed metric by its target, or says the target is not set yet", () => {
      trackRecordQuery.mockReturnValue(settled(AVAILABLE));
      const reading = (value: string, extra: Record<string, unknown> = {}) => ({
        value,
        startDate: "2026-11-20T00:00:00.000Z",
        breakdown: JSON.stringify({ commitmentType: "health" }),
        ...extra,
      });
      indicatorQuery.mockReturnValue(
        settled([
          {
            id: "cadence",
            name: "Release cadence",
            unitOfMeasure: "days",
            datapoints: [
              reading("16", {
                startDate: "2026-11-10T00:00:00.000Z",
                thresholdOp: "<=",
                thresholdValue: 45,
              }),
              reading("15", { thresholdOp: "<=", thresholdValue: 45 }),
            ],
          },
          {
            id: "snapshot",
            name: "Snapshot age",
            unitOfMeasure: "seconds",
            datapoints: [
              reading("1600", { startDate: "2026-11-10T00:00:00.000Z" }),
              reading("1621"),
            ],
          },
        ])
      );

      render(<ApplicationInsightsPanel referenceNumber="APP-1" />);

      expect(screen.getByText("Meeting target")).toBeInTheDocument();
      expect(screen.getByText("No target yet")).toBeInTheDocument();
    });

    it("lists Sim reviews and opens the Simocracy tab", async () => {
      trackRecordQuery.mockReturnValue(settled(AVAILABLE));
      integrationsQuery.mockReturnValue(settled([{ key: "simocracy", enabled: true }]));
      simEvaluationsQuery.mockReturnValue(
        settled({
          evaluations: [
            {
              sim: { simUri: "at://sim/ken", simName: "Ken AI", avatar: null },
              reasoning: "Every verifiable commitment checks out.",
              mvf: [
                { dollars: 0, marginalValueMilli: 900 },
                { dollars: 756000, marginalValueMilli: 0 },
              ],
            },
          ],
        })
      );
      const onOpenSimocracyTab = vi.fn();

      render(
        <ApplicationInsightsPanel referenceNumber="APP-1" onOpenSimocracyTab={onOpenSimocracyTab} />
      );
      await userEvent.click(screen.getByRole("button", { name: "Review in the Simocracy tab" }));

      expect(screen.getByText("Ken AI")).toBeInTheDocument();
      expect(screen.getByText("$756,000")).toBeInTheDocument();
      expect(onOpenSimocracyTab).toHaveBeenCalled();
    });
  });
});
