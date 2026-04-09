import { act, render } from "@testing-library/react";
import React from "react";

// Mock heavy dependencies
vi.mock("@tanstack/react-query", () => ({
  QueryClientProvider: ({ children }: any) => children,
}));

vi.mock("wagmi", () => ({
  WagmiProvider: ({ children }: any) => children,
}));

vi.mock("@/utilities/query-client", () => ({
  queryClient: {},
}));

vi.mock("@/utilities/wagmi/privy-config", () => ({
  minimalWagmiConfig: {},
}));

// Mock the dynamic import target
const mockPrivyComponent = vi.fn(() => null);
vi.mock(
  "@/components/Utilities/PrivyWagmiProviders",
  () => ({ __esModule: true, default: mockPrivyComponent }),
  { virtual: true }
);

describe("PrivyProviderWrapper", () => {
  let originalLocalStorage: Storage;
  let mockGetItem: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockGetItem = vi.fn().mockReturnValue(null);
    originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      value: { getItem: mockGetItem, setItem: vi.fn(), removeItem: vi.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
  });

  it("should load Privy immediately when privy:token exists in localStorage", async () => {
    mockGetItem.mockReturnValue("some-token");

    const PrivyProviderWrapper = (await import("@/components/Utilities/PrivyProviderWrapper"))
      .default;

    await act(async () => {
      render(
        <PrivyProviderWrapper>
          <div>child</div>
        </PrivyProviderWrapper>
      );
    });

    expect(mockGetItem).toHaveBeenCalledWith("privy:token");
  });

  it("should defer Privy loading for anonymous users (no token)", async () => {
    mockGetItem.mockReturnValue(null);

    // Mock requestIdleCallback
    const mockRIC = vi.fn((cb: IdleRequestCallback) => {
      // Don't call cb immediately — it should be deferred
      return 1;
    });
    const mockCancelRIC = vi.fn();
    window.requestIdleCallback = mockRIC;
    window.cancelIdleCallback = mockCancelRIC;

    const PrivyProviderWrapper = (await import("@/components/Utilities/PrivyProviderWrapper"))
      .default;

    await act(async () => {
      render(
        <PrivyProviderWrapper>
          <div>child</div>
        </PrivyProviderWrapper>
      );
    });

    expect(mockRIC).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 5000,
    });
  });
});
