import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAskKarmaPersona } from "@/src/features/ask-karma/hooks/use-ask-karma-persona";
import fetchData from "@/utilities/fetchData";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: vi.fn() }));
vi.mock("@/utilities/fetchData", () => ({ default: vi.fn() }));

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockUsePermissions = usePermissions as unknown as ReturnType<typeof vi.fn>;
const mockFetchData = fetchData as unknown as ReturnType<typeof vi.fn>;

function setup({
  authenticated,
  isReviewer,
  isAdmin = false,
}: {
  authenticated: boolean;
  isReviewer: boolean;
  isAdmin?: boolean;
}) {
  mockUseAuth.mockReturnValue({ authenticated, address: authenticated ? "0xabc" : undefined });
  mockUsePermissions.mockReturnValue({ hasRole: isReviewer });
  mockFetchData.mockResolvedValue([{ communities: isAdmin ? [{ uid: "c1" }] : [] }, null]);
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useAskKarmaPersona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'visitor' when the user is signed out", () => {
    setup({ authenticated: false, isReviewer: false });
    const { result } = renderHook(() => useAskKarmaPersona(), { wrapper });
    expect(result.current).toBe("visitor");
  });

  it("returns 'reviewer' when a signed-in user reviews any program", () => {
    setup({ authenticated: true, isReviewer: true });
    const { result } = renderHook(() => useAskKarmaPersona(), { wrapper });
    expect(result.current).toBe("reviewer");
  });

  it("returns 'reviewer' when a signed-in user administers any community", async () => {
    setup({ authenticated: true, isReviewer: false, isAdmin: true });
    const { result } = renderHook(() => useAskKarmaPersona(), { wrapper });
    // Admin status resolves via an async query — defaults to grantee until it lands.
    await waitFor(() => expect(result.current).toBe("reviewer"));
  });

  it("returns 'grantee' for a signed-in user who is neither reviewer nor admin", () => {
    setup({ authenticated: true, isReviewer: false, isAdmin: false });
    const { result } = renderHook(() => useAskKarmaPersona(), { wrapper });
    expect(result.current).toBe("grantee");
  });

  it("ignores reviewer status while signed out", () => {
    // The permission query is disabled when signed out; even if it leaked a
    // stale `true`, a signed-out visitor must stay on the visitor prompts.
    setup({ authenticated: false, isReviewer: true });
    const { result } = renderHook(() => useAskKarmaPersona(), { wrapper });
    expect(result.current).toBe("visitor");
  });

  it("does not query for admin communities while signed out", () => {
    setup({ authenticated: false, isReviewer: false });
    renderHook(() => useAskKarmaPersona(), { wrapper });
    expect(mockFetchData).not.toHaveBeenCalled();
  });
});
