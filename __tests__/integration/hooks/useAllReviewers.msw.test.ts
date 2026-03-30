/**
 * MSW integration tests for useAllReviewers hook.
 *
 * The hook merges milestone and program reviewers into a single
 * deduplicated list. It internally uses useMilestoneReviewers and
 * useProgramReviewers, both of which call fetchData (axios).
 */

import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useAllReviewers } from "@/hooks/useAllReviewers";
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

function makeMilestoneReviewer(overrides: Record<string, unknown>) {
  return {
    publicAddress: overrides.publicAddress ?? "0xabc",
    programId: PROGRAM_ID,
    chainID: 1,
    userProfile: {
      id: "user-1",
      publicAddress: overrides.publicAddress ?? "0xabc",
      name: overrides.name ?? "Alice",
      email: overrides.email ?? "alice@example.com",
      telegram: overrides.telegram ?? "",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
    assignedAt: "2024-06-01T10:00:00.000Z",
  };
}

function makeProgramReviewer(overrides: Record<string, unknown>) {
  return {
    publicAddress: overrides.publicAddress ?? "0xdef",
    programId: PROGRAM_ID,
    chainID: 1,
    userProfile: {
      id: "user-2",
      publicAddress: overrides.publicAddress ?? "0xdef",
      name: overrides.name ?? "Bob",
      email: overrides.email ?? "bob@example.com",
      telegram: overrides.telegram ?? "",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
    assignedAt: "2024-06-01T10:00:00.000Z",
  };
}

describe("useAllReviewers (MSW integration)", () => {
  it("returns loading state initially", () => {
    const { result } = renderHookWithProviders(() => useAllReviewers(PROGRAM_ID));
    expect(result.current.isLoading).toBe(true);
  });

  it("merges milestone and program reviewers on success", async () => {
    server.use(
      http.get("*/v2/programs/:programId/milestone-reviewers", () =>
        HttpResponse.json([makeMilestoneReviewer({ email: "alice@example.com", name: "Alice" })])
      ),
      http.get("*/v2/funding-program-configs/:programId/reviewers", () =>
        // The program reviewers service expects { reviewers: [...] }
        HttpResponse.json({
          reviewers: [makeProgramReviewer({ email: "bob@example.com", name: "Bob" })],
        })
      )
    );

    const { result } = renderHookWithProviders(() => useAllReviewers(PROGRAM_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    const emails = result.current.data.map((r) => r.email);
    expect(emails).toContain("alice@example.com");
    expect(emails).toContain("bob@example.com");
  });

  it("deduplicates by email, milestone reviewers take priority", async () => {
    server.use(
      http.get("*/v2/programs/:programId/milestone-reviewers", () =>
        HttpResponse.json([
          makeMilestoneReviewer({
            email: "shared@example.com",
            name: "Alice (milestone)",
          }),
        ])
      ),
      http.get("*/v2/funding-program-configs/:programId/reviewers", () =>
        HttpResponse.json({
          reviewers: [
            makeProgramReviewer({
              email: "shared@example.com",
              name: "Alice (program)",
            }),
          ],
        })
      )
    );

    const { result } = renderHookWithProviders(() => useAllReviewers(PROGRAM_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Deduplicated to 1 entry, milestone reviewer wins
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].name).toBe("Alice (milestone)");
  });

  it("returns error if either sub-query errors", async () => {
    server.use(
      http.get("*/v2/programs/:programId/milestone-reviewers", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      ),
      http.get("*/v2/funding-program-configs/:programId/reviewers", () =>
        HttpResponse.json({ reviewers: [] })
      )
    );

    const { result } = renderHookWithProviders(() => useAllReviewers(PROGRAM_ID));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("handles both lists empty", async () => {
    server.use(
      http.get("*/v2/programs/:programId/milestone-reviewers", () => HttpResponse.json([])),
      http.get("*/v2/funding-program-configs/:programId/reviewers", () =>
        HttpResponse.json({ reviewers: [] })
      )
    );

    const { result } = renderHookWithProviders(() => useAllReviewers(PROGRAM_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });
});
