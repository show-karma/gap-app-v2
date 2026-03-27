/**
 * MSW integration tests for useMilestoneReviewers hook.
 *
 * The hook requires authentication and fetches milestone reviewers
 * via milestoneReviewersService.getReviewers which calls fetchData (axios)
 * against /v2/programs/:programId/milestone-reviewers.
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

// Mock useAuth to provide authenticated state
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authenticated: true,
    address: "0x1234567890abcdef1234567890abcdef12345678",
    ready: true,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    isConnected: true,
  }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams(),
}));

installMswLifecycle();

const PROGRAM_ID = "prog-001";

describe("useMilestoneReviewers (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useMilestoneReviewers(PROGRAM_ID));
    expect(result.current.isLoading).toBe(true);
  });

  it("returns reviewers on success", async () => {
    server.use(
      http.get("*/v2/programs/:programId/milestone-reviewers", () =>
        HttpResponse.json([
          {
            publicAddress: "0xabc123",
            programId: PROGRAM_ID,
            chainID: 1,
            userProfile: {
              id: "user-1",
              publicAddress: "0xabc123",
              name: "Alice",
              email: "alice@example.com",
              telegram: "@alice",
              createdAt: "2024-01-01T00:00:00.000Z",
              updatedAt: "2024-01-01T00:00:00.000Z",
            },
            assignedAt: "2024-06-01T10:00:00.000Z",
            assignedBy: "0xadmin",
          },
        ])
      )
    );

    const { result } = renderHookWithProviders(() => useMilestoneReviewers(PROGRAM_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe("Alice");
    expect(result.current.data![0].email).toBe("alice@example.com");
    expect(result.current.isError).toBe(false);
  });

  it("returns error on 500", async () => {
    server.use(
      http.get("*/v2/programs/:programId/milestone-reviewers", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      )
    );

    const { result } = renderHookWithProviders(() => useMilestoneReviewers(PROGRAM_ID));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("handles empty reviewers list", async () => {
    server.use(
      http.get("*/v2/programs/:programId/milestone-reviewers", () => HttpResponse.json([]))
    );

    const { result } = renderHookWithProviders(() => useMilestoneReviewers(PROGRAM_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it("returns empty list when API reports no reviewers found", async () => {
    // The service treats "Milestone Reviewer Not Found" as empty, not error
    server.use(
      http.get("*/v2/programs/:programId/milestone-reviewers", () =>
        HttpResponse.json({ message: "Milestone Reviewer Not Found" }, { status: 404 })
      )
    );

    const { result } = renderHookWithProviders(() => useMilestoneReviewers(PROGRAM_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it("does not fetch when programId is empty", () => {
    const { result } = renderHookWithProviders(() => useMilestoneReviewers(""));
    // enabled: !!programId && authenticated is false
    expect(result.current.isLoading).toBe(false);
  });
});
