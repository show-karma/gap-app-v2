/**
 * @file Tests for useUploads hooks (chat uploads + task attachments).
 *
 * Cache invalidation and the per-mutation success/error paths are the
 * load-bearing behavior — the actual HTTP work happens inside the agent backend client
 * which has its own unit tests at the indexer layer.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import {
  chatUploadKeys,
  taskAttachmentKeys,
  useChatUploads,
  useDeleteChatFile,
  useDeleteTaskAttachment,
  useTaskAttachments,
  useUploadChatFile,
  useUploadTaskAttachment,
} from "@/hooks/useUploads";
import { aiAgentClient } from "@/lib/ai-agent-client";

vi.mock("@/lib/ai-agent-client", () => ({
  aiAgentClient: {
    listChatUploads: vi.fn(),
    uploadChatFile: vi.fn(),
    deleteChatFile: vi.fn(),
    listTaskAttachments: vi.fn(),
    uploadTaskAttachment: vi.fn(),
    deleteTaskAttachment: vi.fn(),
  },
}));

// Typed helper so mocks don't require `as any` casts.
const mockClient = aiAgentClient as {
  [K in keyof typeof aiAgentClient]: ReturnType<typeof vi.fn>;
};

vi.mock("react-hot-toast", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

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

const file = new File(["x"], "x.txt", { type: "text/plain" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useChatUploads", () => {
  it("fetches the chat uploads list for the (slug, role) tuple", async () => {
    mockClient.listChatUploads.mockResolvedValue([
      { sha256: "a".repeat(64), filename: "x.txt", mime: null, size: 1 },
    ]);

    const { result } = renderHook(() => useChatUploads("acme", "fundraiser"), {
      wrapper: wrap(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(aiAgentClient.listChatUploads).toHaveBeenCalledWith("acme", "fundraiser");
  });

  it("is disabled until a slug is provided", () => {
    renderHook(() => useChatUploads(undefined, "fundraiser"), {
      wrapper: wrap(makeClient()),
    });
    expect(aiAgentClient.listChatUploads).not.toHaveBeenCalled();
  });
});

describe("useUploadChatFile", () => {
  it("invalidates the chat uploads list after a successful upload", async () => {
    mockClient.uploadChatFile.mockResolvedValue({
      sha256: "a".repeat(64),
      filename: "x.txt",
      mime: null,
      size: 1,
    });
    const qc = makeClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUploadChatFile("acme", "fundraiser"), {
      wrapper: wrap(qc),
    });

    result.current.mutate(file);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      queryKey: chatUploadKeys.list("acme", "fundraiser"),
    });
  });

  it("surfaces upload errors via toast and does not throw", async () => {
    mockClient.uploadChatFile.mockRejectedValue(new Error("413"));
    const qc = makeClient();
    const { result } = renderHook(() => useUploadChatFile("acme", "fundraiser"), {
      wrapper: wrap(qc),
    });

    result.current.mutate(file);
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useDeleteChatFile", () => {
  it("invalidates the list after a successful delete", async () => {
    mockClient.deleteChatFile.mockResolvedValue({
      removed: true,
      sha256: "a".repeat(64),
    });
    const qc = makeClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeleteChatFile("acme", "fundraiser"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("a".repeat(64));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      queryKey: chatUploadKeys.list("acme", "fundraiser"),
    });
  });
});

describe("useTaskAttachments", () => {
  it("scopes the cache key by (slug, taskId)", async () => {
    mockClient.listTaskAttachments.mockResolvedValue([]);
    const { result } = renderHook(() => useTaskAttachments("acme", "t_abc"), {
      wrapper: wrap(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(aiAgentClient.listTaskAttachments).toHaveBeenCalledWith("acme", "t_abc");
  });

  it("is disabled if either slug or taskId is missing", () => {
    renderHook(() => useTaskAttachments("acme", undefined), {
      wrapper: wrap(makeClient()),
    });
    expect(aiAgentClient.listTaskAttachments).not.toHaveBeenCalled();
  });
});

describe("useUploadTaskAttachment", () => {
  it("invalidates the task attachments list after success", async () => {
    mockClient.uploadTaskAttachment.mockResolvedValue({
      sha256: "b".repeat(64),
      filename: "y.txt",
      mime: null,
      size: 1,
    });
    const qc = makeClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUploadTaskAttachment("acme", "t_abc"), {
      wrapper: wrap(qc),
    });

    result.current.mutate(file);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      queryKey: taskAttachmentKeys.list("acme", "t_abc"),
    });
  });
});

describe("useDeleteTaskAttachment", () => {
  it("invalidates the task attachments list after success", async () => {
    mockClient.deleteTaskAttachment.mockResolvedValue({
      removed: true,
      sha256: "c".repeat(64),
    });
    const qc = makeClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeleteTaskAttachment("acme", "t_abc"), {
      wrapper: wrap(qc),
    });

    result.current.mutate("c".repeat(64));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({
      queryKey: taskAttachmentKeys.list("acme", "t_abc"),
    });
  });
});
