/**
 * CommunityStatCards component tests using MSW for data fetching.
 *
 * Verifies loading, success, and error states for community stats
 * displayed on community pages.
 */
import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { installMswLifecycle, server } from "@/__tests__/msw/server";
import { renderWithProviders } from "@/__tests__/utils/render";
import { CommunityStatCards } from "@/components/Pages/Communities/Impact/StatCards";

const BASE = "http://localhost:4000";

// Mock next/navigation hooks
const mockCommunityId = "test-community-slug";
let mockProgramId: string | null = null;

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: mockCommunityId }),
  useSearchParams: () => ({
    get: (key: string) => (key === "programId" ? mockProgramId : null),
  }),
  usePathname: () => "/community/test-community-slug",
}));

// Mock community store for filter state
vi.mock("@/store/community", () => ({
  useCommunityStore: () => ({
    totalProjects: 0,
    totalGrants: 0,
    totalMilestones: 0,
    isLoadingFilters: false,
  }),
}));

installMswLifecycle();

describe("CommunityStatCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgramId = null;
  });

  describe("loading state", () => {
    it("shows skeleton placeholders while data is loading", () => {
      server.use(
        http.get(`${BASE}/v2/communities/:slug/stats`, () => {
          return new Promise(() => {});
        })
      );

      const { container } = renderWithProviders(<CommunityStatCards />);

      // Skeleton component renders with specific class
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("success state", () => {
    it("renders stat cards with community data", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/:slug/stats`, () => {
          return HttpResponse.json({
            totalProjects: 25,
            totalGrants: 50,
            totalMilestones: 137,
            projectUpdates: 75,
            projectUpdatesBreakdown: {
              projectMilestones: 80,
              projectCompletedMilestones: 30,
              projectUpdates: 40,
              grantMilestones: 57,
              grantCompletedMilestones: 25,
              grantUpdates: 60,
            },
          });
        })
      );

      renderWithProviders(<CommunityStatCards />);

      // Wait for the actual query data to render (not just the static labels)
      await waitFor(() => {
        expect(screen.getByText("50")).toBeInTheDocument();
      });

      expect(screen.getByText("Total Grants")).toBeInTheDocument();
      expect(screen.getByText("Total Projects")).toBeInTheDocument();
      expect(screen.getByText("Project Updates")).toBeInTheDocument();
      expect(screen.getByText("75")).toBeInTheDocument();

      // Milestones card: completed = 30 + 25 = 55, total = 137
      expect(screen.getByText("55 / 137")).toBeInTheDocument();
      expect(screen.getByText("Completed / Total Milestones")).toBeInTheDocument();
      expect(screen.getByText("40.1%")).toBeInTheDocument();
      expect(screen.getByText("59.9%")).toBeInTheDocument();

      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuenow", String((55 / 137) * 100));
    });

    it("renders 0 / 0 milestones without dividing by zero", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/:slug/stats`, () => {
          return HttpResponse.json({
            totalProjects: 1,
            totalGrants: 1,
            totalMilestones: 0,
            projectUpdates: 1,
            projectUpdatesBreakdown: {
              projectMilestones: 0,
              projectCompletedMilestones: 0,
              projectUpdates: 0,
              grantMilestones: 0,
              grantCompletedMilestones: 0,
              grantUpdates: 0,
            },
          });
        })
      );

      renderWithProviders(<CommunityStatCards />);

      expect(await screen.findByText("0 / 0")).toBeInTheDocument();
      const percents = screen.getAllByText("0.0%");
      expect(percents.length).toBe(2);
    });

    it("renders dash when values are zero or falsy", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/:slug/stats`, () => {
          return HttpResponse.json({
            totalProjects: 0,
            totalGrants: 0,
            totalMilestones: 0,
            projectUpdates: 0,
            projectUpdatesBreakdown: null,
          });
        })
      );

      renderWithProviders(<CommunityStatCards />);

      // Wait for query to resolve - zero values render as "-"
      await waitFor(() => {
        const dashes = screen.getAllByText("-");
        expect(dashes.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("with programId filter", () => {
    it("hides Total Grants card when programId is set", async () => {
      mockProgramId = "prog-123";

      server.use(
        http.get(`${BASE}/v2/communities/:slug/stats`, () => {
          return HttpResponse.json({
            totalProjects: 10,
            totalGrants: 20,
            totalMilestones: 30,
            projectUpdates: 40,
            projectUpdatesBreakdown: null,
          });
        })
      );

      renderWithProviders(<CommunityStatCards />);

      await waitFor(() => {
        expect(screen.getByText("Total Projects")).toBeInTheDocument();
      });

      // Total Grants should be filtered out when programId is set
      expect(screen.queryByText("Total Grants")).not.toBeInTheDocument();
      expect(screen.getByText("Project Updates")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows dash placeholders when API returns error", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/:slug/stats`, () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        })
      );

      renderWithProviders(<CommunityStatCards />);

      // On error, stats never populate, so dash "-" is shown
      await waitFor(
        () => {
          const dashes = screen.getAllByText("-");
          expect(dashes.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("card structure", () => {
    it("renders all expected stat labels", async () => {
      server.use(
        http.get(`${BASE}/v2/communities/:slug/stats`, () => {
          return HttpResponse.json({
            totalProjects: 1,
            totalGrants: 1,
            totalMilestones: 1,
            projectUpdates: 1,
            projectUpdatesBreakdown: null,
          });
        })
      );

      renderWithProviders(<CommunityStatCards />);

      await waitFor(() => {
        expect(screen.getByText("Total Projects")).toBeInTheDocument();
        expect(screen.getByText("Total Grants")).toBeInTheDocument();
        expect(screen.getByText("Project Updates")).toBeInTheDocument();
      });
    });
  });
});
