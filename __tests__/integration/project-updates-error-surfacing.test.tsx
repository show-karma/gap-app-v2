/**
 * The updates feed's error state, wired end to end.
 *
 * Every other test around this feed mocks `useProjectProfile`, so they prove
 * UpdatesContent renders a banner when TOLD there is an error — never that the
 * hook actually reports one when the fetch fails. That gap is exactly what QA
 * scenario A2 kept catching: with the request blocked, no error or retry text
 * appeared anywhere on the page.
 *
 * The cause was `useProjectUpdates` not inheriting `defaultQueryOptions`, so it
 * fell back to React Query's default `retry: 3` with exponential backoff. A
 * failed request spent ~7s in silent retries before `error` was ever set, which
 * reads to a user as "nothing happened".
 *
 * So this test uses a REAL QueryClient and a rejecting service, and asserts the
 * banner appears promptly. Nothing about the error path is mocked.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project" }),
  usePathname: () => "/project/test-project",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: () => ({ isAuthorized: false, isLoading: false }),
}));

vi.mock("@/store", () => ({
  useOwnerStore: (sel: (s: unknown) => unknown) => sel({ isOwner: false }),
  useProjectStore: (sel: (s: unknown) => unknown) =>
    sel({ isProjectAdmin: false, isProjectOwner: false, setProject: vi.fn() }),
}));

// The feed's own children are irrelevant here — this is about the error path.
vi.mock("@/components/Pages/Project/v2/MainContent/ActivityFeed", () => ({
  ActivityFeed: () => <div data-testid="activity-feed" />,
}));
vi.mock("@/components/Pages/Project/v2/MainContent/ActivityFilters", () => ({
  ActivityFilters: () => <div data-testid="activity-filters" />,
}));

// The three services useProjectProfile aggregates. Only updates rejects.
vi.mock("@/services/project-updates.service", () => ({
  getProjectUpdates: vi.fn(),
}));
vi.mock("@/services/project-grants.service", () => ({
  getProjectGrants: vi.fn(async () => []),
}));
vi.mock("@/services/project-impacts.service", () => ({
  getProjectImpacts: vi.fn(async () => []),
}));
vi.mock("@/services/project.service", () => ({
  getProject: vi.fn(async () => ({
    uid: "0xabc",
    chainID: 10,
    details: { title: "Test Project", slug: "test-project" },
    members: [],
  })),
}));

import { UpdatesContent } from "@/components/Pages/Project/v2/Content/UpdatesContent";
import { getProjectUpdates } from "@/services/project-updates.service";

function withRealQueryClient(ui: ReactNode) {
  // No retry override and no error swallowing: the component tree runs against
  // the app's real query configuration, which is the thing under test.
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("updates feed — error surfacing through the real query layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the error banner and a retry when the updates request fails", async () => {
    vi.mocked(getProjectUpdates).mockRejectedValue(new Error("Network request failed"));

    withRealQueryClient(<UpdatesContent />);

    // Prompt, not after several seconds of silent retries.
    await waitFor(
      () => {
        expect(screen.getByTestId("updates-content-error")).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not show the error banner when the request succeeds", async () => {
    vi.mocked(getProjectUpdates).mockResolvedValue({
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [],
      grantUpdates: [],
    });

    withRealQueryClient(<UpdatesContent />);

    await waitFor(() => {
      expect(screen.getByTestId("activity-filters")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("updates-content-error")).not.toBeInTheDocument();
  });
});
