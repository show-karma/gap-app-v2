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

  it("should not crash the boot path when localStorage access throws (QA A6)", async () => {
    // Privacy mode / blocked storage / enterprise policy: any access throws.
    // This effect runs on every page — an unguarded read crashed the whole app
    // to the error boundary before login was reachable. Unreadable storage must
    // mean "anonymous user", never a crash.
    mockGetItem.mockImplementation(() => {
      throw new Error("SecurityError: access denied");
    });

    const PrivyProviderWrapper = (await import("@/components/Utilities/PrivyProviderWrapper"))
      .default;

    let rendered: ReturnType<typeof render> | undefined;
    await act(async () => {
      rendered = render(
        <PrivyProviderWrapper>
          <div>child-under-blocked-storage</div>
        </PrivyProviderWrapper>
      );
    });

    // The app renders, children included — no error boundary.
    expect(rendered?.getByText("child-under-blocked-storage")).toBeTruthy();
    // And the anonymous deferred-load path was taken, not the token path.
    expect(mockPrivyComponent).not.toHaveBeenCalled();
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
