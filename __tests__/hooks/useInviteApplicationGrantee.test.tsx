import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInviteApplicationGrantee } from "@/hooks/useInviteApplicationGrantee";
import { HttpError } from "@/utilities/api/errors";

const mockPost = vi.fn();
vi.mock("@/utilities/api/client", () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
}));

const mockToastError = vi.fn();
vi.mock("react-hot-toast", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
}));

const ENDPOINT = "/v2/funding-applications/APP-1/team-members";

const httpError = (status: number, body?: unknown) =>
  new HttpError(status, { endpoint: ENDPOINT, method: "POST", body });

describe("useInviteApplicationGrantee", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const invite = async () => {
    const { result } = renderHook(() => useInviteApplicationGrantee("APP-1"), { wrapper });
    await act(async () => {
      await result.current
        .inviteGrantee({ name: "Jennifer", email: "jennifer@filoz.org" })
        .catch(() => undefined);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("shows the server's explanation instead of the raw HTTP status", async () => {
    mockPost.mockRejectedValue(
      httpError(400, {
        message: "Team member with email jennifer@filoz.org already exists for application APP-1",
      })
    );

    await invite();

    expect(mockToastError).toHaveBeenCalledWith(
      "Team member with email jennifer@filoz.org already exists for application APP-1"
    );
  });

  it("falls back to a readable message when the server gives none", async () => {
    mockPost.mockRejectedValue(httpError(500));

    await invite();

    expect(mockToastError).toHaveBeenCalledWith("Couldn't add the co-applicant. Please try again.");
  });
});
