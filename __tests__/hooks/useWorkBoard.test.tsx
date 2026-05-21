/**
 * @file Tests for useWorkBoard optimistic update hooks.
 *
 * Covers useUpdateWorkTaskStatus, useAddWorkComment, and useArchiveWorkTask —
 * specifically the optimistic-update-then-rollback-on-error pattern.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import {
  useAddWorkComment,
  useArchiveWorkTask,
  useUpdateWorkTaskAssignee,
  useUpdateWorkTaskStatus,
} from "@/hooks/useWorkBoard";
import { aiAgentClient, type WorkTask, type WorkTaskComment } from "@/lib/ai-agent-client";

vi.mock("@/lib/ai-agent-client", () => ({
  aiAgentClient: {
    listWorkTasks: vi.fn(),
    updateWorkTaskStatus: vi.fn(),
    updateWorkTaskAssignee: vi.fn(),
    archiveWorkTask: vi.fn(),
    addWorkTaskComment: vi.fn(),
    getWorkTask: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

const mockClient = aiAgentClient as {
  [K in keyof typeof aiAgentClient]: ReturnType<typeof vi.fn>;
};

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const WORK_LIST_KEY = ["work", "list", "acme"];

const sampleTasks: WorkTask[] = [
  { id: "t1", title: "First task", status: "queued" },
  { id: "t2", title: "Second task", status: "working" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUpdateWorkTaskStatus", () => {
  it("optimistically mutates the cache immediately on mutate()", async () => {
    mockClient.updateWorkTaskStatus.mockResolvedValue(undefined);
    const qc = makeClient();
    qc.setQueryData<WorkTask[]>(WORK_LIST_KEY, sampleTasks);

    const { result } = renderHook(() => useUpdateWorkTaskStatus("acme"), {
      wrapper: wrap(qc),
    });

    result.current.mutate({ taskId: "t1", status: "done" });

    // The cache should reflect the new status optimistically before the server responds
    await waitFor(() => {
      const tasks = qc.getQueryData<WorkTask[]>(WORK_LIST_KEY);
      const t1 = tasks?.find((t) => t.id === "t1");
      expect(t1?.status).toBe("done");
    });
  });

  it("rolls back to previous cache on error", async () => {
    mockClient.updateWorkTaskStatus.mockRejectedValue(new Error("network error"));
    const qc = makeClient();
    qc.setQueryData<WorkTask[]>(WORK_LIST_KEY, sampleTasks);

    const { result } = renderHook(() => useUpdateWorkTaskStatus("acme"), {
      wrapper: wrap(qc),
    });

    result.current.mutate({ taskId: "t1", status: "done" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const tasks = qc.getQueryData<WorkTask[]>(WORK_LIST_KEY);
    const t1 = tasks?.find((t) => t.id === "t1");
    expect(t1?.status).toBe("queued"); // rolled back to original
  });
});

describe("useAddWorkComment", () => {
  const TASK_KEY = ["work", "task", "acme", "t1"];
  const baseTask: WorkTask & { comments: WorkTaskComment[] } = {
    id: "t1",
    title: "Task",
    status: "queued",
    comments: [],
  };

  it("appends comment optimistically to the task cache", async () => {
    mockClient.addWorkTaskComment.mockResolvedValue({
      id: "c1",
      taskId: "t1",
      body: "hello",
      createdAt: new Date().toISOString(),
    });
    const qc = makeClient();
    qc.setQueryData(TASK_KEY, baseTask);

    const { result } = renderHook(() => useAddWorkComment("acme", "t1"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("hello");

    await waitFor(() => {
      const task = qc.getQueryData<typeof baseTask>(TASK_KEY);
      expect(task?.comments.some((c) => c.body === "hello")).toBe(true);
    });
  });

  it("rolls back optimistic comment on error", async () => {
    mockClient.addWorkTaskComment.mockRejectedValue(new Error("bad"));
    const qc = makeClient();
    qc.setQueryData(TASK_KEY, baseTask);

    const { result } = renderHook(() => useAddWorkComment("acme", "t1"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("rollback me");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const task = qc.getQueryData<typeof baseTask>(TASK_KEY);
    expect(task?.comments).toHaveLength(0);
  });
});

describe("useUpdateWorkTaskAssignee", () => {
  const TASK_KEY = ["work", "task", "acme", "t1"];

  it("optimistically updates assignee in both list and task caches", async () => {
    mockClient.updateWorkTaskAssignee.mockResolvedValue({
      id: "t1",
      title: "First task",
      status: "queued",
      assignee: "fundraiser",
    });
    const qc = makeClient();
    qc.setQueryData<WorkTask[]>(WORK_LIST_KEY, sampleTasks);
    qc.setQueryData<WorkTask>(TASK_KEY, sampleTasks[0]);

    const { result } = renderHook(() => useUpdateWorkTaskAssignee("acme", "t1"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("fundraiser");

    await waitFor(() => {
      const tasks = qc.getQueryData<WorkTask[]>(WORK_LIST_KEY);
      expect(tasks?.find((t) => t.id === "t1")?.assignee).toBe("fundraiser");
      const task = qc.getQueryData<WorkTask>(TASK_KEY);
      expect(task?.assignee).toBe("fundraiser");
    });
  });

  it("rolls back assignee on error", async () => {
    mockClient.updateWorkTaskAssignee.mockRejectedValue(new Error("nope"));
    const qc = makeClient();
    qc.setQueryData<WorkTask[]>(WORK_LIST_KEY, sampleTasks);

    const { result } = renderHook(() => useUpdateWorkTaskAssignee("acme", "t1"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("fundraiser");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const tasks = qc.getQueryData<WorkTask[]>(WORK_LIST_KEY);
    expect(tasks?.find((t) => t.id === "t1")?.assignee).toBeUndefined();
  });

  it("passes null through when unassigning", async () => {
    mockClient.updateWorkTaskAssignee.mockResolvedValue({
      id: "t1",
      title: "First task",
      status: "queued",
      assignee: null,
    });
    const qc = makeClient();
    qc.setQueryData<WorkTask[]>(WORK_LIST_KEY, [
      { id: "t1", title: "First task", status: "queued", assignee: "fundraiser" },
    ]);

    const { result } = renderHook(() => useUpdateWorkTaskAssignee("acme", "t1"), {
      wrapper: wrap(qc),
    });

    result.current.mutate(null);

    await waitFor(() => {
      expect(mockClient.updateWorkTaskAssignee).toHaveBeenCalledWith("acme", "t1", null);
    });
  });
});

describe("useArchiveWorkTask", () => {
  it("removes task optimistically from the list cache", async () => {
    mockClient.archiveWorkTask.mockResolvedValue(undefined);
    const qc = makeClient();
    qc.setQueryData<WorkTask[]>(WORK_LIST_KEY, sampleTasks);

    const { result } = renderHook(() => useArchiveWorkTask("acme"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("t1");

    await waitFor(() => {
      const tasks = qc.getQueryData<WorkTask[]>(WORK_LIST_KEY);
      expect(tasks?.some((t) => t.id === "t1")).toBe(false);
    });
  });

  it("rolls back removed task on error", async () => {
    mockClient.archiveWorkTask.mockRejectedValue(new Error("forbidden"));
    const qc = makeClient();
    qc.setQueryData<WorkTask[]>(WORK_LIST_KEY, sampleTasks);

    const { result } = renderHook(() => useArchiveWorkTask("acme"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("t1");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const tasks = qc.getQueryData<WorkTask[]>(WORK_LIST_KEY);
    expect(tasks?.some((t) => t.id === "t1")).toBe(true);
  });
});
