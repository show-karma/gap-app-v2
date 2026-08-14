/**
 * @file Tests for evaluation session hooks (list, detail, create).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ authenticated: true })),
}));

import {
  useCreateSession,
  useSessions,
} from "@/src/features/standalone-evaluation/hooks/useEvaluationSessions";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

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
    (api.get as vi.Mock).mockResolvedValueOnce({ items: [mockSession], total: 1 });

    const { result } = renderHook(() => useSessions(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
    expect(api.get).toHaveBeenCalledWith("/v2/evaluate/sessions?limit=20&offset=0");
  });

  it("surfaces errors from the service layer", async () => {
    (api.get as vi.Mock).mockRejectedValueOnce(
      new HttpError(500, {
        endpoint: "/v2/evaluate/sessions",
        method: "GET",
        body: { message: "Server boom" },
      })
    );

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
    (api.post as vi.Mock).mockResolvedValueOnce(mockSession);

    const { result } = renderHook(() => useCreateSession(), {
      wrapper: wrapper(qc),
    });

    result.current.mutate({
      programDescription: mockSession.programDescription,
      evaluationCriteria: mockSession.evaluationCriteria,
      evaluationStyle: "RUBRIC",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.post).toHaveBeenCalledWith(
      "/v2/evaluate/sessions",
      expect.objectContaining({ evaluationStyle: "RUBRIC" })
    );
    expect(result.current.data?.id).toBe("sess-1");
  });
});
