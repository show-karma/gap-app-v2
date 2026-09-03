/**
 * @file Every mutation that SPENDS a metered dimension has to drop the cached
 * entitlement, or the billing page and the header quota chip keep showing the
 * pre-spend count until its 30s staleTime expires.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";

const mockAskQuestions = vi.fn();
const mockRequestIntro = vi.fn();
const mockCreateDonorHandle = vi.fn();

vi.mock("@/services/diligence.service", () => ({
  askQuestions: (...args: unknown[]) => mockAskQuestions(...args),
  requestIntro: (...args: unknown[]) => mockRequestIntro(...args),
  fetchDiligenceResponseContext: vi.fn(),
  getCandidateDiligence: vi.fn(),
  getDiligenceTemplate: vi.fn(),
  getOutreachPreview: vi.fn(),
  saveDiligenceTemplate: vi.fn(),
  submitDiligenceResponse: vi.fn(),
  updateAdvisorEmail: vi.fn(),
}));

vi.mock("@/services/donor-research.service", () => ({
  createDonorHandle: (...args: unknown[]) => mockCreateDonorHandle(...args),
  getDonorHandle: vi.fn(),
  listDonorHandles: vi.fn(),
  updateDonorHandle: vi.fn(),
}));

import { useAskQuestions, useRequestIntro } from "@/hooks/useDiligence";
import { donorEntitlementQueryKey } from "@/hooks/useDonorBilling";
import { useCreateDonorHandle } from "@/hooks/useDonorHandles";

interface QueryWrapperProps {
  children: React.ReactNode;
}

const buildClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

const wrapper =
  (qc: QueryClient) =>
  ({ children }: QueryWrapperProps) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );

describe("entitlement invalidation on spend", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
  });
  afterEach(() => qc.clear());

  it("invalidates the entitlement after a diligence send", async () => {
    mockAskQuestions.mockResolvedValue({ coarseStatus: "in_progress" });
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useAskQuestions(), { wrapper: wrapper(qc) });
    result.current.mutate({ reportId: "report-1", candidateId: "candidate-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: donorEntitlementQueryKey });
  });

  it("invalidates the entitlement when an intro is queued", async () => {
    mockRequestIntro.mockResolvedValue({ kind: "queued" });
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useRequestIntro(), { wrapper: wrapper(qc) });
    result.current.mutate({ reportId: "report-1", candidateId: "candidate-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: donorEntitlementQueryKey });
  });

  it("leaves the entitlement alone when the intro only asked for an email", async () => {
    // `email_required` spends nothing — it resolves so the UI can run the
    // email-capture flow and re-attempt.
    mockRequestIntro.mockResolvedValue({ kind: "email_required" });
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useRequestIntro(), { wrapper: wrapper(qc) });
    result.current.mutate({ reportId: "report-1", candidateId: "candidate-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: donorEntitlementQueryKey });
  });

  it("invalidates the entitlement after a donor handle is created", async () => {
    // A handle consumes a donor-profile slot, which the billing page caps.
    mockCreateDonorHandle.mockResolvedValue({ id: "handle-1" });
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useCreateDonorHandle(), { wrapper: wrapper(qc) });
    result.current.mutate({ opaqueLabel: "Smith Family" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: donorEntitlementQueryKey });
  });
});
