import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGranteeApplicationAccess } from "../hooks/use-grantee-application-access";

vi.mock("@/utilities/fetchData", () => ({ default: vi.fn() }));

import fetchData from "@/utilities/fetchData";

const mockFetch = fetchData as unknown as ReturnType<typeof vi.fn>;

const COMMUNITY = "test-community";

const makeApp = (referenceNumber: string) => ({ referenceNumber });

const okResponse = (apps: Array<{ referenceNumber: string }>, total: number) =>
  [
    {
      applications: apps,
      pagination: { page: 1, limit: 1, total, totalPages: 1 },
      statusCounts: {},
    },
    null,
  ] as const;

describe("useGranteeApplicationAccess", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("flags a single-application user as a grantee and links to that application", async () => {
    mockFetch.mockResolvedValue(okResponse([makeApp("REF-1")], 1));

    const { result } = renderHook(
      () =>
        useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY, programId: "prog-1" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    expect(result.current.isGrantee).toBe(true);
    expect(result.current.applicationCount).toBe(1);
    // URL must be keyed by referenceNumber, not an internal id.
    expect(result.current.redirectUrl).toContain("REF-1");
    expect(result.current.redirectUrl).toContain(COMMUNITY);
    // Program scoping is forwarded to the endpoint.
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("communitySlug=test-community&programId=prog-1"),
      "GET"
    );
  });

  it("scopes to the community only when no program is provided", async () => {
    mockFetch.mockResolvedValue(okResponse([makeApp("REF-1")], 1));

    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("communitySlug=test-community");
    expect(url).not.toContain("programId=");
  });

  it("uses pagination.total (not applications.length) so a multi-application user goes to the dashboard", async () => {
    // limit=1 returns a single application, but total reports the real count.
    mockFetch.mockResolvedValue(okResponse([makeApp("REF-1")], 3));

    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    expect(result.current.isGrantee).toBe(true);
    expect(result.current.applicationCount).toBe(3);
    expect(result.current.redirectUrl).toBe("/dashboard");
  });

  it("is not a grantee when the user has no applications", async () => {
    mockFetch.mockResolvedValue(okResponse([], 0));

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
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not fetch when communityId is missing", () => {
    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: undefined }),
      { wrapper }
    );

    expect(result.current.isResolving).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("surfaces a transient lookup failure as isError (not a false grantee)", async () => {
    mockFetch.mockResolvedValue([null, "boom"] as const);

    const { result } = renderHook(
      () => useGranteeApplicationAccess({ enabled: true, communityId: COMMUNITY }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isGrantee).toBe(false);
  });
});
