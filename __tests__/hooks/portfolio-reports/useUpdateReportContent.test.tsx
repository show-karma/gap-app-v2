/**
 * @file Regression tests for useUpdateReportContent cache reconciliation.
 * @description Saving a title/content edit on an *unpublished* (draft) report
 * used to update only the single-report cache — the admin list cache was left
 * stale, so the change never appeared on the manage list ("the title didn't
 * save"). These tests lock the list-cache patch for both draft and published
 * reports.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { useUpdateReportContent } from "@/hooks/portfolio-reports/usePortfolioReports";
import * as portfolioService from "@/services/portfolio-reports.service";

vi.mock("@/services/portfolio-reports.service");

const mockUpdateReportContent = vi.mocked(portfolioService.updateReportContent);

const SLUG = "filecoin";
// Mirror usePortfolioReports' key: [...reports(slug), status] with status undefined.
const LIST_KEY = ["portfolio-reports", SLUG, undefined];

function reportFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "report-1",
    reportConfigId: "config-1",
    communityId: "community-1",
    runDate: "2026-03-15",
    status: "draft",
    title: null,
    content: "# Report",
    dataSnapshot: {},
    modelId: "gpt-4.1",
    tokenUsage: null,
    generatedAt: "2026-04-01T00:00:00.000Z",
    generationError: null,
    publishedAt: null,
    publishedBy: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("useUpdateReportContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the saved title into the admin list cache for an unpublished draft", async () => {
    const { queryClient, wrapper } = createWrapper();
    const draft = reportFixture({ id: "draft-1", status: "draft", title: null });
    queryClient.setQueryData(LIST_KEY, [draft]);

    const updated = {
      ...draft,
      title: "Pods Report — June 2026",
      updatedAt: "2026-04-02T00:00:00.000Z",
    };
    mockUpdateReportContent.mockResolvedValue(updated as any);

    const { result } = renderHook(() => useUpdateReportContent(SLUG), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        reportId: "draft-1",
        content: draft.content,
        title: "Pods Report — June 2026",
      });
    });

    const list = queryClient.getQueryData<any[]>(LIST_KEY);
    expect(list?.[0].title).toBe("Pods Report — June 2026");
    // Still a draft — no publish happened.
    expect(list?.[0].status).toBe("draft");
    // Single-report cache is updated too (drives the editor's own view).
    expect(queryClient.getQueryData<any>(["portfolio-report", SLUG, "draft-1"])?.title).toBe(
      "Pods Report — June 2026"
    );
  });

  it("leaves unrelated reports in the list untouched", async () => {
    const { queryClient, wrapper } = createWrapper();
    const target = reportFixture({ id: "r1", title: null });
    const other = reportFixture({ id: "r2", reportConfigId: "config-2", title: "Untouched" });
    queryClient.setQueryData(LIST_KEY, [target, other]);

    mockUpdateReportContent.mockResolvedValue({ ...target, title: "New" } as any);

    const { result } = renderHook(() => useUpdateReportContent(SLUG), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ reportId: "r1", content: target.content, title: "New" });
    });

    const list = queryClient.getQueryData<any[]>(LIST_KEY);
    expect(list?.find((r) => r.id === "r1").title).toBe("New");
    expect(list?.find((r) => r.id === "r2").title).toBe("Untouched");
  });
});
