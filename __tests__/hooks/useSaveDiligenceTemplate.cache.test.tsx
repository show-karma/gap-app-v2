import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSaveDiligenceTemplate = vi.fn();

vi.mock("@/services/diligence.service", () => ({
  getDiligenceTemplate: vi.fn(),
  saveDiligenceTemplate: (...args: unknown[]) => mockSaveDiligenceTemplate(...args),
  getCandidateDiligence: vi.fn(),
  getOutreachPreview: vi.fn(),
  askQuestions: vi.fn(),
  requestIntro: vi.fn(),
  getDiligenceResponseContext: vi.fn(),
  submitDiligenceResponse: vi.fn(),
  updateAdvisorEmail: vi.fn(),
}));

import {
  diligenceTemplateQueryKey,
  reportDiligenceTemplateQueryKey,
  useSaveDiligenceTemplate,
} from "@/hooks/useDiligence";

/**
 * A single template row is cached under several keys — the caller's `/me` copy
 * plus one per report resolving to the same owner. A save must never leave a
 * sibling copy holding pre-save state: the empty-template guard reads it, so a
 * stale copy would keep showing the first-run question editor for a template
 * that already has questions.
 */
describe("useSaveDiligenceTemplate cache invalidation", () => {
  const saved = { questions: [{ id: "q-1", text: "Budget?" }], updatedAt: null };
  const stale = { questions: [], updatedAt: null };

  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  /** `true` once React Query has marked the key for refetch. */
  const isInvalidated = (key: readonly unknown[]) =>
    queryClient.getQueryState(key)?.isInvalidated === true;

  /** Seeds a key as a settled, non-stale cache entry. */
  const seed = (key: readonly unknown[]) => {
    queryClient.setQueryData(key, stale);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveDiligenceTemplate.mockResolvedValue(saved);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("seeds the report it saved and invalidates the caller's own copy", async () => {
    seed(diligenceTemplateQueryKey);

    const { result } = renderHook(() => useSaveDiligenceTemplate("report-1"), { wrapper });
    result.current.mutate({ questions: saved.questions });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(reportDiligenceTemplateQueryKey("report-1"))).toEqual(saved);
    expect(isInvalidated(diligenceTemplateQueryKey)).toBe(true);
  });

  it("invalidates other reports' copies, which may resolve to the same owner", async () => {
    seed(reportDiligenceTemplateQueryKey("report-2"));

    const { result } = renderHook(() => useSaveDiligenceTemplate("report-1"), { wrapper });
    result.current.mutate({ questions: saved.questions });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(isInvalidated(reportDiligenceTemplateQueryKey("report-2"))).toBe(true);
  });

  it("leaves the copy it just seeded fresh rather than refetching it", async () => {
    const { result } = renderHook(() => useSaveDiligenceTemplate("report-1"), { wrapper });
    result.current.mutate({ questions: saved.questions });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(isInvalidated(reportDiligenceTemplateQueryKey("report-1"))).toBe(false);
  });

  it("invalidates report-scoped copies when the standalone editor saves", async () => {
    seed(reportDiligenceTemplateQueryKey("report-1"));
    seed(reportDiligenceTemplateQueryKey("report-2"));

    const { result } = renderHook(() => useSaveDiligenceTemplate(), { wrapper });
    result.current.mutate({ questions: saved.questions });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(diligenceTemplateQueryKey)).toEqual(saved);
    expect(isInvalidated(reportDiligenceTemplateQueryKey("report-1"))).toBe(true);
    expect(isInvalidated(reportDiligenceTemplateQueryKey("report-2"))).toBe(true);
  });

  it("leaves the standalone copy it just seeded fresh", async () => {
    const { result } = renderHook(() => useSaveDiligenceTemplate(), { wrapper });
    result.current.mutate({ questions: saved.questions });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(isInvalidated(diligenceTemplateQueryKey)).toBe(false);
  });

  it("touches no cached copy when the save fails", async () => {
    mockSaveDiligenceTemplate.mockRejectedValue(new Error("save failed"));
    seed(diligenceTemplateQueryKey);
    seed(reportDiligenceTemplateQueryKey("report-1"));
    seed(reportDiligenceTemplateQueryKey("report-2"));

    const { result } = renderHook(() => useSaveDiligenceTemplate("report-1"), { wrapper });
    result.current.mutate({ questions: saved.questions });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // A rejected save must not seed the target key with questions the server
    // never accepted, nor sweep siblings that are still accurate.
    expect(queryClient.getQueryData(reportDiligenceTemplateQueryKey("report-1"))).toEqual(stale);
    expect(queryClient.getQueryData(diligenceTemplateQueryKey)).toEqual(stale);
    expect(isInvalidated(diligenceTemplateQueryKey)).toBe(false);
    expect(isInvalidated(reportDiligenceTemplateQueryKey("report-2"))).toBe(false);
  });
});
