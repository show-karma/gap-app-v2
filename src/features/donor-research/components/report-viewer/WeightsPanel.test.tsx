import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reorderReportCandidates, updateReportConfig } from "@/services/donor-research.service";
import type {
  CompositeWeights,
  ResearchReportCandidate,
  ResearchReportDetail,
} from "@/types/donor-research";
import { WeightsPanel } from "./WeightsPanel";

vi.mock("@/services/donor-research.service");
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockUpdate = updateReportConfig as unknown as ReturnType<typeof vi.fn>;
const mockReorder = reorderReportCandidates as unknown as ReturnType<typeof vi.fn>;

const DEFAULT_WEIGHTS: CompositeWeights = {
  onlinePresence: 2500,
  socialPresence: 1000,
  impactRecency: 2500,
  donorMatch: 2500,
  compliance: 1500,
};

function candidate(id: string, featuredFlag: boolean): ResearchReportCandidate {
  return {
    id,
    fundingOrganizationId: `org-${id}`,
    organizationName: `Org ${id}`,
    organizationDescription: null,
    organizationCity: null,
    organizationState: null,
    organizationWebsiteUrl: null,
    ein: id,
    composite: 0.5,
    components: {
      onlinePresence: 0.5,
      socialPresence: 0.5,
      impactRecency: 0.5,
      donorMatch: 0.5,
      compliance: 0.5,
    },
    featuredFlag,
    manualPosition: null,
    complianceVerdict: "verified",
    disqualificationReasons: [],
    complianceChecks: [],
    recentMentions: [],
    stateRegistrationStatus: "not_verified",
    activitySignalStatus: "no_signal",
    websiteLastUpdatedAt: null,
    socialLastPostAt: null,
    socialMetrics: null,
    reasoningSummary: null,
    onePagerText: null,
    detailedText: null,
    financials: [],
  };
}

function buildReport(weights: CompositeWeights | null): ResearchReportDetail {
  return {
    id: "report-1",
    advisorId: "advisor-1",
    donorHandleId: "handle-1",
    donorHandleLabel: null,
    criteriaId: "criteria-1",
    criteria: null,
    mode: "fast",
    status: "complete",
    hasShareToken: false,
    shareToken: null,
    shareTokenExpiresAt: null,
    errorMessage: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    fastCompletedAt: null,
    completedAt: "2026-01-01T00:00:00.000Z",
    geographyDiagnostic: null,
    weights,
    topCount: 3,
    candidates: [
      candidate("c1", true),
      candidate("c2", true),
      candidate("c3", true),
      candidate("c4", false),
    ],
  };
}

function renderPanel(report: ResearchReportDetail) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WeightsPanel report={report} />
    </QueryClientProvider>
  );
}

function openSheet() {
  fireEvent.click(screen.getByRole("button", { name: /adjust ranking/i }));
}

describe("WeightsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue(buildReport(DEFAULT_WEIGHTS));
    mockReorder.mockResolvedValue(buildReport(DEFAULT_WEIGHTS));
  });

  it("renders nothing for a legacy report (weights null)", () => {
    renderPanel(buildReport(null));
    expect(screen.queryByRole("button", { name: /adjust ranking/i })).not.toBeInTheDocument();
  });

  it("opens a live preview list of every candidate in persisted order", () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    const preview = screen.getByRole("region", { name: /live ranking preview/i });
    const items = within(preview).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("Org c1");
    // No top-3 flips under unchanged weights.
    expect(within(preview).queryByText(/entering top 3/i)).not.toBeInTheDocument();
  });

  it("disables Update weights until the weights change", () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    expect(screen.getByRole("button", { name: "Update weights" })).toBeDisabled();
    const firstThumb = screen.getAllByRole("slider")[0];
    firstThumb.focus();
    fireEvent.keyDown(firstThumb, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Update weights" })).toBeEnabled();
  });

  it("commits the adjusted weights through the confirm dialog", async () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    const firstThumb = screen.getAllByRole("slider")[0];
    firstThumb.focus();
    fireEvent.keyDown(firstThumb, { key: "ArrowRight" });

    fireEvent.click(screen.getByRole("button", { name: "Update weights" }));

    const dialog = await screen.findByText("Update report ranking?");
    const dialogEl = dialog.closest('[role="dialog"]') as HTMLElement;
    expect(dialogEl).toHaveTextContent(/no one-pagers will regenerate/i);

    fireEvent.click(within(dialogEl).getByRole("button", { name: "Update weights" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toBe("report-1");
    // Config endpoint receives only the changed field: { weights }.
    expect(mockUpdate.mock.calls[0][1].weights.onlinePresence).toBe(
      DEFAULT_WEIGHTS.onlinePresence + 1
    );
    expect(mockUpdate.mock.calls[0][1].topCount).toBeUndefined();
  });

  it("commits a new featured-set size from the Configs tab as { topCount }", async () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    // Switch to the Configs tab (Radix Tabs activate on focus in jsdom).
    const configTab = screen.getByRole("tab", { name: /configs/i });
    configTab.focus();
    fireEvent.click(configTab);

    // Bump the featured count via the stepper, then commit.
    fireEvent.click(await screen.findByRole("button", { name: /more featured results/i }));
    fireEvent.click(screen.getByRole("button", { name: "Update results" }));

    const dialog = await screen.findByText("Update featured results?");
    const dialogEl = dialog.closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialogEl).getByRole("button", { name: "Update results" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toBe("report-1");
    // Only the changed field is sent: { topCount }, no weights.
    expect(mockUpdate.mock.calls[0][1].topCount).toBe(4);
    expect(mockUpdate.mock.calls[0][1].weights).toBeUndefined();
  });

  it("keeps the sheet open when Escape is pressed on a reorder grip", async () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    // Radix Tabs activate on focus (automatic mode); fireEvent.click alone
    // doesn't move focus in jsdom, so focus the trigger to switch tabs.
    const reorderTab = screen.getByRole("tab", { name: /reorder/i });
    reorderTab.focus();
    fireEvent.click(reorderTab);

    const grip = (await screen.findAllByRole("button", { name: /drag .* to reorder/i }))[0];
    grip.focus();
    fireEvent.keyDown(grip, { key: "Escape" });

    // The panel must stay open — Escape on a grip cancels a drag, not the sheet.
    expect(screen.getByRole("tab", { name: /reorder/i })).toBeInTheDocument();
  });

  it("still closes the sheet when Escape is pressed off the reorder grips", async () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    expect(screen.getByRole("tab", { name: /weights/i })).toBeInTheDocument();

    // Focus the first slider (not a grip), then press Escape — normal dismiss.
    const slider = screen.getAllByRole("slider")[0];
    slider.focus();
    fireEvent.keyDown(slider, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("tab", { name: /weights/i })).not.toBeInTheDocument()
    );
  });
});
