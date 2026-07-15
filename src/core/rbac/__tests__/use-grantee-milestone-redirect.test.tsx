import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGranteeMilestoneRedirect } from "../hooks/use-grantee-milestone-redirect";

vi.mock("@/services/funding-applications", () => ({ fetchUserApplications: vi.fn() }));

const auth = vi.hoisted(() => ({ address: "0xabc" as string | undefined, authenticated: true }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: auth.address, authenticated: auth.authenticated }),
}));

import { fetchUserApplications } from "@/services/funding-applications";

const mockFetchUserApplications = fetchUserApplications as unknown as ReturnType<typeof vi.fn>;

const COMMUNITY = "test-community";
const PROGRAM = "prog-1";
const PROJECT = "project-uid-1";

const makeApp = (referenceNumber: string, projectUID?: string) => ({
  referenceNumber,
  projectUID,
});

const makeResponse = (apps: Array<{ referenceNumber: string; projectUID?: string }>) => ({
  applications: apps,
  pagination: { page: 1, limit: 100, total: apps.length, totalPages: 1 },
  statusCounts: {},
});

describe("useGranteeMilestoneRedirect", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const render = () =>
    renderHook(
      () =>
        useGranteeMilestoneRedirect({
          enabled: true,
          communityId: COMMUNITY,
          programId: PROGRAM,
          projectUid: PROJECT,
        }),
      { wrapper }
    );

  beforeEach(() => {
    auth.address = "0xabc";
    auth.authenticated = true;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("links to the milestones tab of the application matching this project", async () => {
    mockFetchUserApplications.mockResolvedValue(
      makeResponse([makeApp("REF-OTHER", "other-project"), makeApp("REF-MATCH", PROJECT)])
    );

    const { result } = render();

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    expect(result.current.redirectUrl).toContain("REF-MATCH");
    expect(result.current.redirectUrl).toContain("tab=milestones");
    expect(result.current.redirectUrl).not.toContain("REF-OTHER");
    expect(mockFetchUserApplications).toHaveBeenCalledWith({
      communitySlug: COMMUNITY,
      programId: PROGRAM,
      page: 1,
      limit: 100,
    });
  });

  it("resolves to null when the user has an application, but for a different project", async () => {
    mockFetchUserApplications.mockResolvedValue(
      makeResponse([makeApp("REF-OTHER", "other-project")])
    );

    const { result } = render();

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    expect(result.current.redirectUrl).toBeNull();
  });

  it("resolves to null for a pure-public viewer with no applications", async () => {
    mockFetchUserApplications.mockResolvedValue(makeResponse([]));

    const { result } = render();

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    expect(result.current.redirectUrl).toBeNull();
  });

  it("does not fetch and never resolves a URL when disabled", () => {
    const { result } = renderHook(
      () =>
        useGranteeMilestoneRedirect({
          enabled: false,
          communityId: COMMUNITY,
          programId: PROGRAM,
          projectUid: PROJECT,
        }),
      { wrapper }
    );

    expect(result.current.isResolving).toBe(false);
    expect(result.current.redirectUrl).toBeNull();
    expect(mockFetchUserApplications).not.toHaveBeenCalled();
  });

  it("does not fetch when the project uid is missing", () => {
    const { result } = renderHook(
      () =>
        useGranteeMilestoneRedirect({
          enabled: true,
          communityId: COMMUNITY,
          programId: PROGRAM,
          projectUid: undefined,
        }),
      { wrapper }
    );

    expect(result.current.isResolving).toBe(false);
    expect(mockFetchUserApplications).not.toHaveBeenCalled();
  });

  it("does not fetch when the user is not authenticated", () => {
    auth.authenticated = false;

    const { result } = render();

    expect(result.current.isResolving).toBe(false);
    expect(mockFetchUserApplications).not.toHaveBeenCalled();
  });
});
