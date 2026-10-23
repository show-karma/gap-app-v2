import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResearchReportDetail } from "@/types/donor-research";
import { HttpError } from "@/utilities/api/errors";

const fetchSharedReportMock = vi.fn();

vi.mock("@/services/donor-research.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/donor-research.service")>()),
  fetchSharedReport: (token: string) => fetchSharedReportMock(token),
}));
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => ({ ready: true, authenticated: false, user: null }),
}));
vi.mock("@/hooks/useDonorAdvisor", () => ({
  useDonorAdvisor: () => ({ data: undefined, isLoading: false }),
}));
// The brief, top bar and comments are covered by their own suites; stub them
// so this one only exercises the view's load / poll / error states.
vi.mock("../../report-brief/ReportBrief", () => ({
  ReportBrief: ({ report }: { report: ResearchReportDetail }) => (
    <div data-testid="report-brief">{report.id}</div>
  ),
}));
vi.mock("../SharedTopBar", () => ({ SharedTopBar: () => null }));
vi.mock("../CommentOverlay", () => ({ CommentOverlay: () => null }));

import { SharedReportView } from "../SharedReportView";

const disabled = () =>
  new HttpError(503, {
    endpoint: "/v2/donor-research/shared/tok",
    method: "get",
    body: { error: "donor_research_disabled", message: "Donor research is temporarily disabled." },
  });

const report = { id: "report-1", status: "complete" } as unknown as ResearchReportDetail;

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("SharedReportView error states", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("tells the donor the research is paused, not that the link is gone", async () => {
    fetchSharedReportMock.mockRejectedValue(disabled());
    render(<SharedReportView token="tok" />);
    await flush();

    expect(
      screen.getByRole("heading", { level: 1, name: "Research temporarily unavailable" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Research not available" })).toBeNull();
  });

  it("keeps the 'link not available' card for any other failure", async () => {
    fetchSharedReportMock.mockRejectedValue(new HttpError(404, { endpoint: "/x", method: "get" }));
    render(<SharedReportView token="tok" />);
    await flush();

    expect(
      screen.getByRole("heading", { level: 1, name: "Research not available" })
    ).toBeInTheDocument();
  });

  it("recovers on the next poll once the feature is back on", async () => {
    fetchSharedReportMock.mockRejectedValueOnce(disabled()).mockResolvedValue(report);
    render(<SharedReportView token="tok" />);
    await flush();
    expect(
      screen.getByRole("heading", { level: 1, name: "Research temporarily unavailable" })
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(screen.getByTestId("report-brief")).toHaveTextContent("report-1");
    expect(screen.queryByRole("heading", { name: "Research temporarily unavailable" })).toBeNull();
  });
});
