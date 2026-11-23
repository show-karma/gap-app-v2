import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  useApproveSimocracyVerdict,
  useSimocracyApplicationVerdicts,
  useSimocracyMilestoneVerdicts,
} from "@/hooks/useSimocracyMilestoneVerdicts";

const mockFetch = vi.fn();
const mockApprove = vi.fn();
const mockFetchApplication = vi.fn();
vi.mock("@/services/fundingApplicationIntegrations.service", () => ({
  fetchSimocracyMilestoneVerdicts: (ref: string) => mockFetch(ref),
  fetchSimocracyApplicationVerdicts: (ref: string) => mockFetchApplication(ref),
  approveSimocracyVerdict: (ref: string, id: string, revision: number, subject: string) =>
    mockApprove(ref, id, revision, subject),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), loading: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: toast }));

function verdict(overrides: Record<string, unknown> = {}) {
  return {
    verdictId: "v1",
    subject: "milestone",
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
    mayAct: true,
    canPublish: true,
    publishBlocker: null,
    feedback: [],
    revisions: [],
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
    expect(mockFetchApplication).not.toHaveBeenCalled();
  });

  it("loads the application verdicts from their own query", async () => {
    mockFetchApplication.mockResolvedValue({
      verdicts: [verdict({ subject: "application", milestoneUid: null, milestoneTitle: null })],
      forbidden: false,
    });

    const { result } = renderHook(() => useSimocracyApplicationVerdicts("APP-1"), { wrapper });
    await waitFor(() => expect(result.current.data?.verdicts).toHaveLength(1));
    expect(mockFetchApplication).toHaveBeenCalledWith("APP-1");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(client.getQueryData(QUERY_KEYS.simocracyApplicationVerdicts("APP-1"))).toBeDefined();
  });

  it("publishes an application verdict through its own route and cache", async () => {
    const appKey = QUERY_KEYS.simocracyApplicationVerdicts("APP-1");
    const milestoneKey = QUERY_KEYS.simocracyMilestoneVerdicts("APP-1");
    const appVerdict = verdict({
      subject: "application",
      milestoneUid: null,
      milestoneTitle: null,
    });
    client.setQueryData(appKey, { verdicts: [appVerdict], forbidden: false });
    client.setQueryData(milestoneKey, { verdicts: [verdict()], forbidden: false });
    mockApprove.mockResolvedValue({
      verdictId: "v1",
      commentUri: "at://c1",
      cid: "cid",
      publishedRevision: 2,
      alreadyPublished: false,
    });
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useApproveSimocracyVerdict("APP-1"), { wrapper });
    act(() => result.current.mutate({ verdictId: "v1", revision: 2, subject: "application" }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApprove).toHaveBeenCalledWith("APP-1", "v1", 2, "application");
    expect(
      client.getQueryData<{ verdicts: { status: string }[] }>(appKey)?.verdicts[0].status
    ).toBe("published");
    expect(
      client.getQueryData<{ verdicts: { status: string }[] }>(milestoneKey)?.verdicts[0].status
    ).toBe("pending_review");
    const invalidated = invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(invalidated).toContain(JSON.stringify(appKey));
    expect(invalidated).not.toContain(JSON.stringify(milestoneKey));
  });

  it("marks the card as publishing, then published, and refreshes the related caches", async () => {
    const key = QUERY_KEYS.simocracyMilestoneVerdicts("APP-1");
    client.setQueryData(key, { verdicts: [verdict()], forbidden: false });
    let resolve: (value: unknown) => void = () => {};
    mockApprove.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const refetch = vi.spyOn(client, "refetchQueries");

    const { result } = renderHook(() => useApproveSimocracyVerdict("APP-1"), { wrapper });
    act(() => result.current.mutate({ verdictId: "v1", revision: 2, subject: "milestone" }));

    await waitFor(() =>
      expect(client.getQueryData<{ verdicts: { status: string }[] }>(key)?.verdicts[0].status).toBe(
        "publishing"
      )
    );
    expect(toast.loading).toHaveBeenCalledWith("Publishing to Simocracy…", expect.anything());
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
    expect(client.getQueryData<{ verdicts: { status: string }[] }>(key)?.verdicts[0].status).toBe(
      "published"
    );
    expect(toast.success).toHaveBeenCalledWith("Verdict published", expect.anything());
    const invalidated = invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(invalidated).toEqual(
      expect.arrayContaining([JSON.stringify(key), JSON.stringify(["simocracy-feedback", "APP-1"])])
    );
    expect(refetch).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.simocracyComments("APP-1"),
    });
  });

  it("refreshes the application comments, where the published verdict is mirrored", async () => {
    mockApprove.mockResolvedValue({
      verdictId: "v1",
      commentUri: "at://c1",
      cid: "cid",
      publishedRevision: 1,
      alreadyPublished: false,
    });
    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useApproveSimocracyVerdict("APP-1"), { wrapper });
    await act(async () => {
      result.current.mutate({ verdictId: "v1", revision: 1, subject: "application" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const invalidated = invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(invalidated).toContain(JSON.stringify(["application-comments"]));
  });

  it("rolls the card back and shows the server's reason when publishing fails", async () => {
    const key = QUERY_KEYS.simocracyMilestoneVerdicts("APP-1");
    client.setQueryData(key, { verdicts: [verdict()], forbidden: false });
    mockApprove.mockRejectedValue(new Error("The agent re-ran this verdict since you opened it."));

    const { result } = renderHook(() => useApproveSimocracyVerdict("APP-1"), { wrapper });
    act(() => result.current.mutate({ verdictId: "v1", revision: 2, subject: "milestone" }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<{ verdicts: { status: string }[] }>(key)?.verdicts[0].status).toBe(
      "pending_review"
    );
    expect(toast.error).toHaveBeenCalledWith(
      "The agent re-ran this verdict since you opened it.",
      expect.anything()
    );
  });
});
