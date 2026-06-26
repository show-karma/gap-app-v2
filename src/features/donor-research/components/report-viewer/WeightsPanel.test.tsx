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

  it("enables Save changes only once the edited weights total 100%", () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    // Raising one factor unbalances the set (115%): nothing is redistributed, so
    // the single Save stays disabled until the advisor reconciles the total.
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "40" } });
    fireEvent.blur(inputs[0]);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    // Dropping Mission match 25→10 brings the total back to 100% and enables it.
    fireEvent.change(inputs[3], { target: { value: "10" } });
    fireEvent.blur(inputs[3]);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("commits the adjusted weights through the single confirm dialog", async () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    const inputs = screen.getAllByRole("spinbutton");
    // Raise Online presence to 40% and rebalance Mission match to 10% so the
    // five total 100% again (no redistribution happens automatically).
    fireEvent.change(inputs[0], { target: { value: "40" } });
    fireEvent.blur(inputs[0]);
    fireEvent.change(inputs[3], { target: { value: "10" } });
    fireEvent.blur(inputs[3]);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    const dialog = await screen.findByText("Update report ranking?");
    const dialogEl = dialog.closest('[role="dialog"]') as HTMLElement;
    // Equal component scores → no reorder, so no one-pagers flip.
    expect(dialogEl).toHaveTextContent(/no one-pagers will regenerate/i);

    fireEvent.click(within(dialogEl).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toBe("report-1");
    // Both edits committed verbatim; the untouched three are intact and the
    // five total 100% (4000+1000+2500+1000+1500 = 10000).
    expect(mockUpdate.mock.calls[0][1].weights).toEqual({
      onlinePresence: 4000,
      socialPresence: 1000,
      impactRecency: 2500,
      donorMatch: 1000,
      compliance: 1500,
    });
    // Only the dirty slice is sent — topCount unchanged, and no manual reorder.
    expect(mockUpdate.mock.calls[0][1].topCount).toBeUndefined();
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it("saves a featured-count-only change as { topCount } via the shared Save", async () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();

    // Bump the featured count via the stepper (single view, no tabs), then save.
    fireEvent.click(await screen.findByRole("button", { name: /more featured results/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    const dialog = await screen.findByText("Update report ranking?");
    const dialogEl = dialog.closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialogEl).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toBe("report-1");
    // Only the changed field is sent: { topCount }, no weights, no reorder.
    expect(mockUpdate.mock.calls[0][1].topCount).toBe(4);
    expect(mockUpdate.mock.calls[0][1].weights).toBeUndefined();
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it("re-sends an existing manual order when only the config changes", async () => {
    const report = buildReport(DEFAULT_WEIGHTS);
    // The report already carries a manual order (manualPosition set on each row).
    report.candidates = report.candidates.map((c, i) => ({ ...c, manualPosition: i + 1 }));
    renderPanel(report);
    openSheet();

    // Change only the featured count — a config save clears manual order
    // server-side, so the panel must re-send it to preserve it.
    fireEvent.click(await screen.findByRole("button", { name: /more featured results/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    const dialog = await screen.findByText("Update report ranking?");
    const dialogEl = dialog.closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialogEl).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][1].topCount).toBe(4);
    // The existing order is preserved by re-sending it through reorder.
    await waitFor(() => expect(mockReorder).toHaveBeenCalledTimes(1));
    expect(mockReorder.mock.calls[0][1]).toEqual(["c1", "c2", "c3", "c4"]);
  });

  it("drops the manual order when weights change so the list re-ranks", async () => {
    const report = buildReport(DEFAULT_WEIGHTS);
    report.candidates = report.candidates.map((c, i) => ({ ...c, manualPosition: i + 1 }));
    renderPanel(report);
    openSheet();

    // Editing weights re-ranks the list and clears the manual override, so the
    // saved config re-ranks by weight and the old order is NOT re-sent.
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "40" } });
    fireEvent.blur(inputs[0]);
    fireEvent.change(inputs[3], { target: { value: "10" } });
    fireEvent.blur(inputs[3]);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const dialog = await screen.findByText("Update report ranking?");
    const dialogEl = dialog.closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialogEl).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][1].weights).toEqual({
      onlinePresence: 4000,
      socialPresence: 1000,
      impactRecency: 2500,
      donorMatch: 1000,
      compliance: 1500,
    });
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it("keeps the sheet open when Escape is pressed on a reorder grip", async () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    // The ranking list is always visible now (single view), so grips are present.
    const grip = (await screen.findAllByRole("button", { name: /drag .* to reorder/i }))[0];
    grip.focus();
    fireEvent.keyDown(grip, { key: "Escape" });

    // The panel must stay open — Escape on a grip cancels a drag, not the sheet.
    expect(screen.getByRole("heading", { name: "Adjust ranking" })).toBeInTheDocument();
  });

  it("still closes the sheet when Escape is pressed off the reorder grips", async () => {
    renderPanel(buildReport(DEFAULT_WEIGHTS));
    openSheet();
    expect(screen.getAllByRole("slider")).toHaveLength(5);

    // Focus the first slider (not a grip), then press Escape — normal dismiss.
    const slider = screen.getAllByRole("slider")[0];
    slider.focus();
    fireEvent.keyDown(slider, { key: "Escape" });

    await waitFor(() => expect(screen.queryAllByRole("slider")).toHaveLength(0));
  });
});
