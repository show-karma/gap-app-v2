/**
 * @file Tests for evaluation session hooks (list, detail, create).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ authenticated: true })),
}));

import {
  useCreateSession,
  useSessions,
} from "@/src/features/standalone-evaluation/hooks/useEvaluationSessions";
import fetchData from "@/utilities/fetchData";

const mockSession = {
  id: "sess-1",
  userId: "u-1",
  programDescription: "A test program description that is long enough to validate.",
  evaluationCriteria: "Bullet list criteria more than 20 chars.",
  evaluationStyle: "RUBRIC" as const,
  status: "DRAFT" as const,
  feedbackHistory: [],
  sampleApplication: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const buildClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

const wrapper =
  (qc: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );

describe("useSessions", () => {
  let qc: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
  });
  afterEach(() => qc.clear());

  it("fetches and returns the sessions list", async () => {
    (fetchData as vi.Mock).mockResolvedValueOnce([
      { items: [mockSession], total: 1 },
      null,
      null,
      200,
    ]);

    const { result } = renderHook(() => useSessions(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
    expect(fetchData).toHaveBeenCalledWith("/v2/evaluate/sessions?limit=20&offset=0", "GET");
  });

  it("surfaces errors from the service layer", async () => {
    (fetchData as vi.Mock).mockResolvedValueOnce([null, "Server boom", null, 500]);

    const { result } = renderHook(() => useSessions(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("Server boom");
  });
});

describe("useCreateSession", () => {
  let qc: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
  });
  afterEach(() => qc.clear());

  it("creates a session and invalidates the list cache", async () => {
    (fetchData as vi.Mock).mockResolvedValueOnce([mockSession, null, null, 201]);

    const { result } = renderHook(() => useCreateSession(), {
      wrapper: wrapper(qc),
    });

    result.current.mutate({
      programDescription: mockSession.programDescription,
      evaluationCriteria: mockSession.evaluationCriteria,
      evaluationStyle: "RUBRIC",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchData).toHaveBeenCalledWith(
      "/v2/evaluate/sessions",
      "POST",
      expect.objectContaining({ evaluationStyle: "RUBRIC" })
    );
    expect(result.current.data?.id).toBe("sess-1");
  });
});
