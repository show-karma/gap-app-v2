import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useExportReportAll,
  useExportReportSection,
  useReportExportManifest,
} from "@/hooks/portfolio-reports/useReportExport";
import * as portfolioService from "@/services/portfolio-reports.service";
import type { ReportExportDownload } from "@/types/portfolio-report";

vi.mock("@/services/portfolio-reports.service");

const SLUG = "filecoin";
const REPORT_ID = "r-1";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function makeDownload(overrides: Partial<ReportExportDownload> = {}): ReportExportDownload {
  return {
    blob: new Blob(["a,b\n1,2"], { type: "text/csv" }),
    filename: "report-data_2026-04-30_aging_analysis.csv",
    snapshotSource: "generation",
    ...overrides,
  };
}

let clickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window.URL, "createObjectURL", {
    value: vi.fn(() => "blob:mock"),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window.URL, "revokeObjectURL", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("useReportExportManifest", () => {
  it("does not fetch until enabled", () => {
    renderHook(() => useReportExportManifest(SLUG, REPORT_ID, false), {
      wrapper: createWrapper(),
    });
    expect(portfolioService.getReportExportManifest).not.toHaveBeenCalled();
  });

  it("fetches the manifest when enabled", async () => {
    vi.mocked(portfolioService.getReportExportManifest).mockResolvedValue({
      snapshotSource: "generation",
      sections: [{ key: "aging_analysis", title: "Aging", rowCount: 3 }],
    });

    const { result } = renderHook(() => useReportExportManifest(SLUG, REPORT_ID, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(portfolioService.getReportExportManifest).toHaveBeenCalledWith(SLUG, REPORT_ID);
    expect(result.current.data?.sections[0].key).toBe("aging_analysis");
  });
});

describe("useExportReportSection", () => {
  it("downloads the section and toasts success", async () => {
    vi.mocked(portfolioService.exportReportSection).mockResolvedValue(makeDownload());

    const { result } = renderHook(() => useExportReportSection(SLUG, REPORT_ID), {
      wrapper: createWrapper(),
    });
    result.current.mutate("aging_analysis");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(portfolioService.exportReportSection).toHaveBeenCalledWith(
      SLUG,
      REPORT_ID,
      "aging_analysis"
    );
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Data exported");
  });

  it("warns that a legacy export reflects current data", async () => {
    vi.mocked(portfolioService.exportReportSection).mockResolvedValue(
      makeDownload({ snapshotSource: "live-recompute" })
    );

    const { result } = renderHook(() => useExportReportSection(SLUG, REPORT_ID), {
      wrapper: createWrapper(),
    });
    result.current.mutate("aging_analysis");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("reflects current data"),
      expect.objectContaining({ icon: "ℹ️" })
    );
  });

  it("toasts an error and does not download when the export fails", async () => {
    vi.mocked(portfolioService.exportReportSection).mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useExportReportSection(SLUG, REPORT_ID), {
      wrapper: createWrapper(),
    });
    result.current.mutate("aging_analysis");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(clickSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Failed to export data");
  });
});

describe("useExportReportAll", () => {
  it("downloads the all-sections JSON", async () => {
    vi.mocked(portfolioService.exportReportAll).mockResolvedValue(
      makeDownload({ filename: "report-data_r-1.json" })
    );

    const { result } = renderHook(() => useExportReportAll(SLUG, REPORT_ID), {
      wrapper: createWrapper(),
    });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(portfolioService.exportReportAll).toHaveBeenCalledWith(SLUG, REPORT_ID);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
