import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGranteeApplicationAccess } from "../hooks/use-grantee-application-access";

vi.mock("@/services/funding-applications", () => ({ fetchUserApplications: vi.fn() }));

const auth = vi.hoisted(() => ({ address: "0xabc" as string | undefined }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ address: auth.address }) }));

import { fetchUserApplications } from "@/services/funding-applications";

const mockFetchUserApplications = fetchUserApplications as unknown as ReturnType<typeof vi.fn>;

const COMMUNITY = "test-community";

const makeApp = (referenceNumber: string) => ({ referenceNumber });

const makeResponse = (apps: Array<{ referenceNumber: string }>, total: number) => ({
  applications: apps,
  pagination: { page: 1, limit: 1, total, totalPages: 1 },
  statusCounts: {},
});

describe("useGranteeApplicationAccess", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    auth.address = "0xabc";
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("flags a single-application user as a grantee and links to that application", async () => {
    mockFetchUserApplications.mockResolvedValue(makeResponse([makeApp("REF-1")], 1));

    const { result } = renderHook(
      () =>
        useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY, programId: "prog-1" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    expect(result.current.isGrantee).toBe(true);
    expect(result.current.redirect.kind).toBe("application");
    // URL must be keyed by referenceNumber, not an internal id.
    expect(result.current.redirect.url).toContain("REF-1");
    expect(result.current.redirect.url).toContain(COMMUNITY);
    // Goes through the service with program scoping.
    expect(mockFetchUserApplications).toHaveBeenCalledWith({
      communitySlug: COMMUNITY,
      programId: "prog-1",
      page: 1,
      limit: 1,
    });
  });

  it("scopes to the community only when no program is provided", async () => {
    mockFetchUserApplications.mockResolvedValue(makeResponse([makeApp("REF-1")], 1));

    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    expect(mockFetchUserApplications).toHaveBeenCalledWith({
      communitySlug: COMMUNITY,
      programId: undefined,
      page: 1,
      limit: 1,
    });
  });

  it("uses pagination.total (not applications.length) so a multi-application user goes to the dashboard", async () => {
    // limit=1 returns a single application, but total reports the real count.
    mockFetchUserApplications.mockResolvedValue(makeResponse([makeApp("REF-1")], 3));

    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    expect(result.current.isGrantee).toBe(true);
    expect(result.current.redirect.kind).toBe("dashboard");
    expect(result.current.redirect.url).toBe("/dashboard");
  });

  it("is not a grantee when the user has no applications", async () => {
    mockFetchUserApplications.mockResolvedValue(makeResponse([], 0));

    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    expect(result.current.isGrantee).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("does not fetch and never resolves to a grantee when disabled", () => {
    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: false, communityId: COMMUNITY }),
      { wrapper }
    );

    expect(result.current.isResolving).toBe(false);
    expect(result.current.isGrantee).toBe(false);
    expect(mockFetchUserApplications).not.toHaveBeenCalled();
  });

  it("does not fetch when communityId is missing", () => {
    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: undefined }),
      { wrapper }
    );

    expect(result.current.isResolving).toBe(false);
    expect(mockFetchUserApplications).not.toHaveBeenCalled();
  });

  it("does not fetch when there is no authenticated wallet", () => {
    auth.address = undefined;

    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY }),
      { wrapper }
    );

    expect(result.current.isResolving).toBe(false);
    expect(mockFetchUserApplications).not.toHaveBeenCalled();
  });

  it("surfaces a transient lookup failure as isError (not a false grantee)", async () => {
    mockFetchUserApplications.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isGrantee).toBe(false);
  });
});
