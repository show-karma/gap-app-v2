import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  useApproveSimocracyVerdict,
  useSimocracyMilestoneVerdicts,
} from "@/hooks/useSimocracyMilestoneVerdicts";

const mockFetch = vi.fn();
const mockApprove = vi.fn();
vi.mock("@/services/fundingApplicationIntegrations.service", () => ({
  fetchSimocracyMilestoneVerdicts: (ref: string) => mockFetch(ref),
  approveSimocracyVerdict: (ref: string, id: string, revision: number) =>
    mockApprove(ref, id, revision),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: toast }));

function verdict(overrides: Record<string, unknown> = {}) {
  return {
    verdictId: "v1",
    milestoneUid: "0xm",
    milestoneTitle: "M1",
    simUri: "at://s1",
    simName: "S1",
    commentUri: "at://c1",
    text: "ok",
    status: "pending_review",
    revision: 2,
    publishedRevision: null,
    publishedAt: null,
    publishedBy: null,
    updatedAt: null,
    canPublish: true,
    publishBlocker: null,
    feedback: [],
    ...overrides,
  };
}

describe("useSimocracyMilestoneVerdicts", () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(() => client.clear());

  it("loads the verdicts only when enabled", async () => {
    mockFetch.mockResolvedValue({ verdicts: [verdict()], forbidden: false });

    const disabled = renderHook(() => useSimocracyMilestoneVerdicts("APP-1", { enabled: false }), {
      wrapper,
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(disabled.result.current.data).toBeUndefined();

    const enabled = renderHook(() => useSimocracyMilestoneVerdicts("APP-1"), { wrapper });
    await waitFor(() => expect(enabled.result.current.data?.verdicts).toHaveLength(1));
    expect(mockFetch).toHaveBeenCalledWith("APP-1");
  });

  it("flips the card to published optimistically and invalidates the related caches", async () => {
    const key = QUERY_KEYS.simocracyMilestoneVerdicts("APP-1");
    client.setQueryData(key, { verdicts: [verdict()], forbidden: false });
    let resolve: (value: unknown) => void = () => {};
    mockApprove.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useApproveSimocracyVerdict("APP-1"), { wrapper });
    act(() => result.current.mutate({ verdictId: "v1", revision: 2 }));

    await waitFor(() =>
      expect(client.getQueryData<{ verdicts: { status: string }[] }>(key)?.verdicts[0].status).toBe(
        "published"
      )
    );
    await act(async () => {
      resolve({
        verdictId: "v1",
        commentUri: "at://c1",
        cid: "cid",
        publishedRevision: 2,
        alreadyPublished: false,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith("Verdict published");
    const invalidated = invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(invalidated).toEqual(
      expect.arrayContaining([
        JSON.stringify(key),
        JSON.stringify(QUERY_KEYS.simocracyComments("APP-1")),
        JSON.stringify(["simocracy-feedback", "APP-1"]),
      ])
    );
  });

  it("rolls the card back and shows the server's reason when publishing fails", async () => {
    const key = QUERY_KEYS.simocracyMilestoneVerdicts("APP-1");
    client.setQueryData(key, { verdicts: [verdict()], forbidden: false });
    mockApprove.mockRejectedValue(new Error("The agent re-ran this verdict since you opened it."));

    const { result } = renderHook(() => useApproveSimocracyVerdict("APP-1"), { wrapper });
    act(() => result.current.mutate({ verdictId: "v1", revision: 2 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<{ verdicts: { status: string }[] }>(key)?.verdicts[0].status).toBe(
      "pending_review"
    );
    expect(toast.error).toHaveBeenCalledWith("The agent re-ran this verdict since you opened it.");
  });
});
