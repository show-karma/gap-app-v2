import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExportDataMenu } from "@/components/Pages/Community/PortfolioReports/ExportDataMenu";
import * as portfolioService from "@/services/portfolio-reports.service";

vi.mock("@/services/portfolio-reports.service");

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, node);
}

function renderMenu() {
  return render(
    wrap(createElement(ExportDataMenu, { communitySlug: "filecoin", reportId: "r-1" }))
  );
}

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
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.mocked(portfolioService.getReportExportManifest).mockResolvedValue({
    snapshotSource: "generation",
    sections: [
      { key: "pending_invoices", title: "Pending Invoices", rowCount: 2 },
      { key: "aging_analysis", title: "Milestone/Payment Age", rowCount: 5 },
    ],
  });
});

describe("ExportDataMenu", () => {
  it("renders the trigger without fetching the manifest", () => {
    renderMenu();
    expect(screen.getByRole("button", { name: /export data/i })).toBeInTheDocument();
    expect(portfolioService.getReportExportManifest).not.toHaveBeenCalled();
  });

  it("lists sections (aging first, pluralized) plus an all-sections item on open", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /export data/i }));

    const agingItem = await screen.findByText("Milestone/Payment Age — 5 rows");
    const invoicesItem = screen.getByText("Pending Invoices — 2 rows");
    expect(agingItem).toBeInTheDocument();
    expect(invoicesItem).toBeInTheDocument();
    expect(screen.getByText("All sections (Excel) — 2 sheets")).toBeInTheDocument();

    // Aging section is ordered before the others.
    expect(agingItem.compareDocumentPosition(invoicesItem)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("exports a section when its item is clicked", async () => {
    vi.mocked(portfolioService.exportReportSection).mockResolvedValue({
      blob: new Blob(["a,b"], { type: "text/csv" }),
      filename: "report-data.csv",
      snapshotSource: "generation",
    });
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /export data/i }));
    await user.click(await screen.findByText("Milestone/Payment Age — 5 rows"));

    await waitFor(() =>
      expect(portfolioService.exportReportSection).toHaveBeenCalledWith(
        "filecoin",
        "r-1",
        "aging_analysis",
        false
      )
    );
  });

  it("downloads a workbook when the all-sections item is clicked", async () => {
    vi.mocked(portfolioService.exportReportWorkbook).mockResolvedValue({
      blob: new Blob(["PK"], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      filename: "report-data.xlsx",
      snapshotSource: "generation",
    });
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /export data/i }));
    await user.click(await screen.findByText("All sections (Excel) — 2 sheets"));

    await waitFor(() =>
      expect(portfolioService.exportReportWorkbook).toHaveBeenCalledWith("filecoin", "r-1", false)
    );
  });

  it("refetches the manifest with current data when refresh is toggled on", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /export data/i }));
    await screen.findByText("Milestone/Payment Age — 5 rows");
    await user.click(screen.getByText("Use current data instead"));

    await waitFor(() =>
      expect(portfolioService.getReportExportManifest).toHaveBeenCalledWith("filecoin", "r-1", true)
    );
    expect(await screen.findByText("Using current data")).toBeInTheDocument();
  });

  it("carries the refresh choice into the section download", async () => {
    vi.mocked(portfolioService.exportReportSection).mockResolvedValue({
      blob: new Blob(["a,b"], { type: "text/csv" }),
      filename: "report-data.csv",
      snapshotSource: "live-refresh",
    });
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /export data/i }));
    await screen.findByText("Milestone/Payment Age — 5 rows");
    await user.click(screen.getByText("Use current data instead"));
    await user.click(await screen.findByText("Milestone/Payment Age — 5 rows"));

    await waitFor(() =>
      expect(portfolioService.exportReportSection).toHaveBeenCalledWith(
        "filecoin",
        "r-1",
        "aging_analysis",
        true
      )
    );
  });

  it("warns that a legacy (live-recompute) report may not match the original", async () => {
    vi.mocked(portfolioService.getReportExportManifest).mockResolvedValue({
      snapshotSource: "live-recompute",
      sections: [{ key: "aging_analysis", title: "Milestone/Payment Age", rowCount: 5 }],
    });
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /export data/i }));

    expect(await screen.findByText(/predates data snapshots/i)).toBeInTheDocument();
  });

  it("does not warn for a snapshot-backed report", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: /export data/i }));

    await screen.findByText("Milestone/Payment Age — 5 rows");
    expect(screen.queryByText(/predates data snapshots/i)).not.toBeInTheDocument();
  });
});
