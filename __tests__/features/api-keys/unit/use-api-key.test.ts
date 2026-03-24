import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import {
  apiKeyKeys,
  useApiKey,
  useCreateApiKey,
  useRevokeApiKey,
} from "@/src/features/api-keys/hooks/use-api-key";

vi.mock("@/src/features/api-keys/services/api-key.service", () => ({
  apiKeyService: {
    get: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
  },
}));

const mockApiKeyService = require("@/src/features/api-keys/services/api-key.service").apiKeyService;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("apiKeyKeys", () => {
  it("should produce correct query keys", () => {
    expect(apiKeyKeys.all).toEqual(["apiKeys"]);
    expect(apiKeyKeys.user("0xabc")).toEqual(["apiKeys", "0xabc"]);
  });
});

describe("useApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch API key when address is provided", async () => {
    const mockData = {
      apiKey: {
        keyHint: "...abcd",
        name: "My Key",
        isActive: true,
        createdAt: "2026-02-22",
        lastUsedAt: null,
      },
    };
    mockApiKeyService.get.mockResolvedValue(mockData);

    const { result } = renderHook(() => useApiKey("0xabc"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(mockApiKeyService.get).toHaveBeenCalledTimes(1);
  });

  it("should not fetch when address is undefined and not authenticated", () => {
    const { result } = renderHook(() => useApiKey(undefined, false), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiKeyService.get).not.toHaveBeenCalled();
  });

  it("should fetch for Farcaster users with no wallet address", async () => {
    // Farcaster users are authenticated via JWT but have no wallet address.
    // The API uses JWT auth, not wallet address, so the query should fire.
    const mockData = { apiKey: null };
    mockApiKeyService.get.mockResolvedValue(mockData);

    const { result } = renderHook(() => useApiKey(undefined, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiKeyService.get).toHaveBeenCalledTimes(1);
  });
});

describe("useCreateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call create and invoke onSuccess", async () => {
    const mockResponse = {
      key: "karma_abc123",
      keyHint: "...c123",
      name: "Test",
      createdAt: "2026-02-22",
    };
    mockApiKeyService.create.mockResolvedValue(mockResponse);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useCreateApiKey({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.mutate("Test");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    expect(mockApiKeyService.create).toHaveBeenCalledWith("Test");
  });

  it("should invoke onError on failure", async () => {
    mockApiKeyService.create.mockRejectedValue(new Error("Failed"));
    const onError = vi.fn();

    const { result } = renderHook(() => useCreateApiKey({ onError }), {
      wrapper: createWrapper(),
    });

    result.current.mutate("Test");

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("useRevokeApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call revoke and invoke onSuccess", async () => {
    mockApiKeyService.revoke.mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useRevokeApiKey({ onSuccess }), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalled();
  });

  it("should invoke onError on failure", async () => {
    mockApiKeyService.revoke.mockRejectedValue(new Error("Failed"));
    const onError = vi.fn();

    const { result } = renderHook(() => useRevokeApiKey({ onError }), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
