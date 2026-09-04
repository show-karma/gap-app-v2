/**
 * @file Analytics tests for the mutation hooks Phase 1 instrumented.
 *
 * Each hook is driven through its real mutation with the service layer mocked,
 * so what is asserted is the event a genuine success or failure produces —
 * including that a wallet address or an error *message* never reaches an event
 * property.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

// ---------------------------------------------------------------- services

const scannerService = vi.hoisted(() => ({ findOrCreateScan: vi.fn() }));
vi.mock("@/src/features/scanner/services/scanner.service", () => scannerService);

const donorResearchService = vi.hoisted(() => ({
  generateShareToken: vi.fn(),
  revokeShareToken: vi.fn(),
}));
vi.mock("@/services/donor-research.service", () => donorResearchService);
vi.mock("@/hooks/useDonorReports", () => ({ donorReportQueryKey: (id: string) => ["report", id] }));

const portfolioService = vi.hoisted(() => ({
  exportReportSection: vi.fn(),
  exportReportAll: vi.fn(),
  getReportExportManifest: vi.fn(),
}));
vi.mock("@/services/portfolio-reports.service", () => portfolioService);

const reviewersService = vi.hoisted(() => ({
  applicationReviewersService: { assignReviewers: vi.fn() },
}));
vi.mock("@/services/application-reviewers.service", () => reviewersService);

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  useExportReportAll,
  useExportReportSection,
} from "@/hooks/portfolio-reports/useReportExport";
import { ReviewerType, useReviewerAssignment } from "@/hooks/useReviewerAssignment";
import { useGenerateShareToken } from "@/hooks/useShareToken";
import { useSubmitScan } from "@/src/features/scanner/hooks/use-submit-scan";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const eventNames = () => vi.mocked(track).mock.calls.map(([name]) => name);

const propsOf = (name: string) =>
  vi.mocked(track).mock.calls.find(([eventName]) => eventName === name)?.[1] as
    | Record<string, unknown>
    | undefined;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSubmitScan", () => {
  it("reports the submission with the surface it came from, then the completion", async () => {
    scannerService.findOrCreateScan.mockResolvedValue({
      slug: "acme-org",
      status: "complete",
      created: true,
    });

    const { result } = renderHook(() => useSubmitScan({ entryPoint: "scanner_submit_form" }), {
      wrapper,
    });
    act(() => {
      result.current.mutate({ url: "https://acme.example" });
    });

    await waitFor(() => expect(eventNames()).toContain("scanner_scan_completed"));

    expect(propsOf("scanner_scan_submitted")).toEqual({ entry_point: "scanner_submit_form" });
    expect(propsOf("scanner_scan_completed")).toEqual({
      scan_id: "acme-org",
      grade: null,
      total_score: null,
    });
  });

  it("reports the submission before the request, so an abandoned scan still counts", async () => {
    scannerService.findOrCreateScan.mockRejectedValue(
      Object.assign(new Error("Too many requests"), { status: 429 })
    );

    const { result } = renderHook(() => useSubmitScan({ entryPoint: "scanner_site_no_report" }), {
      wrapper,
    });
    act(() => {
      result.current.mutate({ url: "https://acme.example" });
    });

    await waitFor(() => expect(eventNames()).toContain("scanner_scan_failed"));

    expect(eventNames()).toEqual(["scanner_scan_submitted", "scanner_scan_failed"]);
    expect(propsOf("scanner_scan_failed")).toEqual({ error_code: "http_429" });
  });
});

describe("useGenerateShareToken", () => {
  it("reports the share with the report it belongs to", async () => {
    donorResearchService.generateShareToken.mockResolvedValue({ token: "s3cr3t" });

    const { result } = renderHook(() => useGenerateShareToken(), { wrapper });
    act(() => {
      result.current.mutate({ reportId: "report-1", body: {} });
    });

    await waitFor(() => expect(track).toHaveBeenCalled());

    expect(track).toHaveBeenCalledWith("report_shared", {
      report_id: "report-1",
      share_type: "token",
    });
  });

  it("never reports the share token itself", async () => {
    donorResearchService.generateShareToken.mockResolvedValue({ token: "s3cr3t" });

    const { result } = renderHook(() => useGenerateShareToken(), { wrapper });
    act(() => {
      result.current.mutate({ reportId: "report-1", body: {} });
    });

    await waitFor(() => expect(track).toHaveBeenCalled());

    expect(JSON.stringify(propsOf("report_shared"))).not.toContain("s3cr3t");
  });
});

describe("report export", () => {
  const download = {
    blob: new Blob(["a,b"]),
    filename: "export.csv",
    snapshotSource: "snapshot" as const,
  };

  beforeEach(() => {
    // handleDownload drives a real anchor click; stub the URL plumbing jsdom lacks.
    window.URL.createObjectURL = vi.fn(() => "blob:mock");
    window.URL.revokeObjectURL = vi.fn();
  });

  it("reports a section export as csv", async () => {
    portfolioService.exportReportSection.mockResolvedValue(download);

    const { result } = renderHook(() => useExportReportSection("gitcoin", "report-1"), { wrapper });
    act(() => {
      result.current.mutate("milestones");
    });

    await waitFor(() => expect(track).toHaveBeenCalled());

    expect(track).toHaveBeenCalledWith("report_exported", {
      report_id: "report-1",
      format: "csv",
    });
  });

  it("reports a full export as json", async () => {
    portfolioService.exportReportAll.mockResolvedValue({ ...download, filename: "export.json" });

    const { result } = renderHook(() => useExportReportAll("gitcoin", "report-1"), { wrapper });
    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(track).toHaveBeenCalled());

    expect(track).toHaveBeenCalledWith("report_exported", {
      report_id: "report-1",
      format: "json",
    });
  });
});

describe("useReviewerAssignment", () => {
  it("reports how many reviewers were assigned, never which wallets", async () => {
    reviewersService.applicationReviewersService.assignReviewers.mockResolvedValue({});

    const { result } = renderHook(
      () => useReviewerAssignment({ applicationId: "app-1", reviewerType: ReviewerType.APP }),
      { wrapper }
    );
    await act(async () => {
      await result.current.assignReviewers([
        "0x1234567890abcdef1234567890abcdef12345678",
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      ]);
    });

    expect(track).toHaveBeenCalledWith("reviewer_assigned", {
      application_id: "app-1",
      reviewer_type: "app",
      reviewer_count: 2,
    });
    expect(JSON.stringify(propsOf("reviewer_assigned"))).not.toContain("0x");
  });

  it("distinguishes milestone reviewers from application reviewers", async () => {
    reviewersService.applicationReviewersService.assignReviewers.mockResolvedValue({});

    const { result } = renderHook(
      () => useReviewerAssignment({ applicationId: "app-1", reviewerType: ReviewerType.MILESTONE }),
      { wrapper }
    );
    await act(async () => {
      await result.current.assignReviewers([]);
    });

    expect(track).toHaveBeenCalledWith("reviewer_assigned", {
      application_id: "app-1",
      reviewer_type: "milestone",
      reviewer_count: 0,
    });
  });

  it("reports nothing when the assignment fails", async () => {
    reviewersService.applicationReviewersService.assignReviewers.mockRejectedValue(
      new Error("nope")
    );

    const { result } = renderHook(
      () => useReviewerAssignment({ applicationId: "app-1", reviewerType: ReviewerType.APP }),
      { wrapper }
    );
    await act(async () => {
      await result.current.assignReviewers(["0xabc"]);
    });

    expect(track).not.toHaveBeenCalled();
  });
});
