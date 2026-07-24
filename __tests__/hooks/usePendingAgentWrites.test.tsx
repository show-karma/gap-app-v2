/**
 * @file Tests for the "Pending agent actions" React Query bindings.
 * Covers the list query, and the approve/reject mutations' optimistic removal,
 * rollback on error, and the 409 "already decided" quiet-refresh branch.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  agentActionsKeys,
  useApproveAgentWrite,
  usePendingAgentWrites,
  useRejectAgentWrite,
} from "@/hooks/agent-actions/usePendingAgentWrites";
import {
  type PendingAgentWrite,
  type PendingAgentWritesList,
  pendingAgentWritesService,
} from "@/services/pending-agent-writes.service";
import { HttpError } from "@/utilities/api/errors";

vi.mock("@/services/pending-agent-writes.service", () => ({
  pendingAgentWritesService: {
    list: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

const mockService = pendingAgentWritesService as unknown as {
  list: ReturnType<typeof vi.fn>;
  approve: ReturnType<typeof vi.fn>;
  reject: ReturnType<typeof vi.fn>;
};

const mockToast = toast as unknown as ReturnType<typeof vi.fn> & {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

function makeWrite(overrides: Partial<PendingAgentWrite> = {}): PendingAgentWrite {
  return {
    id: "pc_1",
    summary: "Reject application #47",
    label: "Approve / reject / revision",
    method: "PUT",
    path: "/v2/funding-applications/47/status",
    body: { status: "rejected" },
    status: "pending",
    clientName: "Claude Desktop",
    createdAt: "2026-07-23T10:00:00.000Z",
    expiresAt: "2026-07-23T22:00:00.000Z",
    decidedAt: null,
    result: null,
    ...overrides,
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function httpError(status: number): HttpError {
  return new HttpError(status, {
    endpoint: "/v2/pending-agent-writes/pc_1/approve",
    method: "POST",
  });
}

function seedPending(client: QueryClient, writes: PendingAgentWrite[]): void {
  const list: PendingAgentWritesList = { writes, total: writes.length };
  client.setQueryData(agentActionsKeys.list("pending"), list);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePendingAgentWrites (query)", () => {
  it("fetches the queue for the given status filter", async () => {
    mockService.list.mockResolvedValue({ writes: [makeWrite()], total: 1 });
    const client = makeClient();

    const { result } = renderHook(() => usePendingAgentWrites("pending"), {
      wrapper: wrap(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.list).toHaveBeenCalledWith("pending");
    expect(result.current.data?.writes).toHaveLength(1);
  });

  it("does not fetch when disabled (no-glimpse gate)", () => {
    const client = makeClient();
    renderHook(() => usePendingAgentWrites("pending", false), { wrapper: wrap(client) });
    expect(mockService.list).not.toHaveBeenCalled();
  });
});

describe("useApproveAgentWrite", () => {
  it("optimistically removes the write from the pending list on mutate", async () => {
    const w1 = makeWrite({ id: "pc_1" });
    const w2 = makeWrite({ id: "pc_2" });
    const client = makeClient();
    seedPending(client, [w1, w2]);
    // Never resolves — lets us observe the optimistic (onMutate) cache state.
    mockService.approve.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useApproveAgentWrite(), { wrapper: wrap(client) });
    result.current.mutate(w1);

    await waitFor(() => {
      const data = client.getQueryData<PendingAgentWritesList>(agentActionsKeys.list("pending"));
      expect(data?.writes.map((w) => w.id)).toEqual(["pc_2"]);
      expect(data?.total).toBe(1);
    });
  });

  it("rolls back the optimistic removal when the approve fails", async () => {
    const w1 = makeWrite({ id: "pc_1" });
    const w2 = makeWrite({ id: "pc_2" });
    const client = makeClient();
    seedPending(client, [w1, w2]);
    mockService.approve.mockRejectedValue(httpError(500));

    const { result } = renderHook(() => useApproveAgentWrite(), { wrapper: wrap(client) });
    await result.current.mutateAsync(w1).catch(() => undefined);

    await waitFor(() => {
      const data = client.getQueryData<PendingAgentWritesList>(agentActionsKeys.list("pending"));
      expect(data?.writes.map((w) => w.id)).toEqual(["pc_1", "pc_2"]);
      expect(data?.total).toBe(2);
    });
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("does not resurrect a row decided by a concurrent mutation when rolling back", async () => {
    const w1 = makeWrite({ id: "pc_1" });
    const w2 = makeWrite({ id: "pc_2" });
    const client = makeClient();
    seedPending(client, [w1, w2]);

    let failApprove: (error: unknown) => void = () => undefined;
    mockService.approve.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          failApprove = reject;
        })
    );
    mockService.reject.mockResolvedValue({ id: "pc_2", status: "rejected" });

    const approveHook = renderHook(() => useApproveAgentWrite(), { wrapper: wrap(client) });
    const rejectHook = renderHook(() => useRejectAgentWrite(), { wrapper: wrap(client) });

    // Approve of pc_1 is left in flight while reject of pc_2 completes.
    const approvePromise = approveHook.result.current.mutateAsync(w1).catch(() => undefined);
    await rejectHook.result.current.mutateAsync(w2);

    // The in-flight approve now fails; its rollback must restore ONLY pc_1,
    // not the pre-approve snapshot that still contained the decided pc_2.
    failApprove(httpError(500));
    await approvePromise;

    await waitFor(() => {
      const data = client.getQueryData<PendingAgentWritesList>(agentActionsKeys.list("pending"));
      expect(data?.writes.map((w) => w.id)).toEqual(["pc_1"]);
      expect(data?.total).toBe(1);
    });
  });

  it("shows an 'already decided' toast on a 409 instead of an error toast", async () => {
    const w1 = makeWrite({ id: "pc_1" });
    const client = makeClient();
    seedPending(client, [w1]);
    mockService.approve.mockRejectedValue(httpError(409));

    const { result } = renderHook(() => useApproveAgentWrite(), { wrapper: wrap(client) });
    await result.current.mutateAsync(w1).catch(() => undefined);

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("warns when the write is approved but execution failed", async () => {
    const w1 = makeWrite({ id: "pc_1" });
    const client = makeClient();
    seedPending(client, [w1]);
    mockService.approve.mockResolvedValue({
      id: "pc_1",
      status: "failed",
      result: { statusCode: 403, error: "forbidden" },
    });

    const { result } = renderHook(() => useApproveAgentWrite(), { wrapper: wrap(client) });
    await result.current.mutateAsync(w1);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    expect(mockToast.success).not.toHaveBeenCalled();
  });
});

describe("useRejectAgentWrite", () => {
  it("optimistically removes the write and toasts success", async () => {
    const w1 = makeWrite({ id: "pc_1" });
    const client = makeClient();
    seedPending(client, [w1]);
    mockService.reject.mockResolvedValue({ id: "pc_1", status: "rejected" });

    const { result } = renderHook(() => useRejectAgentWrite(), { wrapper: wrap(client) });
    await result.current.mutateAsync(w1);

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    expect(mockService.reject).toHaveBeenCalledWith(w1.id);
  });

  it("rolls back on error", async () => {
    const w1 = makeWrite({ id: "pc_1" });
    const w2 = makeWrite({ id: "pc_2" });
    const client = makeClient();
    seedPending(client, [w1, w2]);
    mockService.reject.mockRejectedValue(httpError(500));

    const { result } = renderHook(() => useRejectAgentWrite(), { wrapper: wrap(client) });
    await result.current.mutateAsync(w1).catch(() => undefined);

    await waitFor(() => {
      const data = client.getQueryData<PendingAgentWritesList>(agentActionsKeys.list("pending"));
      expect(data?.writes).toHaveLength(2);
    });
  });
});
