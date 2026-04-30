/**
 * ProjectsStatsSection component tests using MSW for data fetching.
 *
 * Verifies loading, success, and error states for the stats displayed
 * on the projects explorer page, including the milestones progress card.
 * Covers both global mode and whitelabel (community-scoped) mode.
 */
import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { installMswLifecycle, server } from "@/__tests__/msw/server";
import { renderWithProviders } from "@/__tests__/utils/render";
import { ProjectsStatsSection } from "@/components/Pages/Projects/StatsSection";
import { WhitelabelProvider } from "@/utilities/whitelabel-context";

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt as string} {...props} />
  ),
}));

const BASE = "http://localhost:4000";
const GLOBAL_STATS_URL = `${BASE}/v2/communities/stats`;
const COMMUNITY_STATS_URL = (slug: string) => `${BASE}/v2/communities/${slug}/stats`;

const renderInWhitelabel = (slug: string) =>
  renderWithProviders(
    <WhitelabelProvider isWhitelabel={true} communitySlug={slug} config={null} tenantConfig={null}>
      <ProjectsStatsSection />
    </WhitelabelProvider>
  );

installMswLifecycle();

describe("ProjectsStatsSection", () => {
  describe("loading state", () => {
    it("shows placeholder dots and applies animate-pulse while data is loading", () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return new Promise(() => {
            // never resolves — keeps loading state
          });
        })
      );

      const { container } = renderWithProviders(<ProjectsStatsSection />);

      const dots = screen.getAllByText("...");
      expect(dots.length).toBeGreaterThanOrEqual(5);

      const pulsing = container.querySelectorAll(".animate-pulse");
      expect(pulsing.length).toBeGreaterThan(0);
    });
  });

  describe("success state (global)", () => {
    it("renders all five stat cards with formatted numbers", async () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return HttpResponse.json({
            totalProjects: 1500,
            totalGrants: 320,
            activeCommunities: 45,
            activeBuilders: 2100,
            totalProjectUpdates: 5000,
            totalMilestones: 137,
            totalCompletedMilestones: 55,
          });
        })
      );

      renderWithProviders(<ProjectsStatsSection />);

      await waitFor(() => {
        expect(screen.getByText("1.5k+")).toBeInTheDocument();
      });

      expect(screen.getByText("Total Projects")).toBeInTheDocument();
      expect(screen.getByText("Grants Tracked")).toBeInTheDocument();
      expect(screen.getByText("Active Communities")).toBeInTheDocument();
      expect(screen.getByText("Active Builders")).toBeInTheDocument();
      expect(screen.getByText("Completed / Total Milestones")).toBeInTheDocument();

      expect(screen.getByText("320+")).toBeInTheDocument();
      expect(screen.getByText("45")).toBeInTheDocument();
      expect(screen.getByText("2.1k+")).toBeInTheDocument();
      expect(screen.getByText("55 / 137")).toBeInTheDocument();
      expect(screen.getByText("40.1%")).toBeInTheDocument();
      expect(screen.getByText("59.9%")).toBeInTheDocument();
    });

    it("renders the progress bar with the correct accessible value", async () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return HttpResponse.json({
            totalProjects: 1,
            totalGrants: 1,
            activeCommunities: 1,
            activeBuilders: 1,
            totalProjectUpdates: 1,
            totalMilestones: 200,
            totalCompletedMilestones: 50,
          });
        })
      );

      renderWithProviders(<ProjectsStatsSection />);

      await screen.findByText("50 / 200");
      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuenow", "25");
    });

    it("formats millions correctly", async () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return HttpResponse.json({
            totalProjects: 2500000,
            totalGrants: 1000000,
            activeCommunities: 500,
            activeBuilders: 10000,
            totalProjectUpdates: 100,
            totalMilestones: 0,
            totalCompletedMilestones: 0,
          });
        })
      );

      renderWithProviders(<ProjectsStatsSection />);

      await waitFor(() => {
        expect(screen.getByText("2.5M+")).toBeInTheDocument();
      });

      expect(screen.getByText("1.0M+")).toBeInTheDocument();
    });

    it("shows zero milestones without dividing by zero", async () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return HttpResponse.json({
            totalProjects: 1,
            totalGrants: 1,
            activeCommunities: 1,
            activeBuilders: 1,
            totalProjectUpdates: 1,
            totalMilestones: 0,
            totalCompletedMilestones: 0,
          });
        })
      );

      renderWithProviders(<ProjectsStatsSection />);

      expect(await screen.findByText("0 / 0")).toBeInTheDocument();
      const percents = screen.getAllByText("0.0%");
      expect(percents.length).toBe(2);
    });
  });

  describe("success state (whitelabel)", () => {
    it("uses community-scoped stats for milestones when on a whitelabel domain", async () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return HttpResponse.json({
            totalProjects: 1500,
            totalGrants: 320,
            activeCommunities: 45,
            activeBuilders: 2100,
            totalProjectUpdates: 5000,
            totalMilestones: 9999,
            totalCompletedMilestones: 9999,
          });
        }),
        http.get(COMMUNITY_STATS_URL("filecoin"), () => {
          return HttpResponse.json({
            totalProjects: 50,
            totalGrants: 25,
            totalMilestones: 137,
            projectUpdates: 200,
            projectUpdatesBreakdown: {
              projectMilestones: 80,
              projectCompletedMilestones: 30,
              projectUpdates: 40,
              grantMilestones: 57,
              grantCompletedMilestones: 25,
              grantUpdates: 60,
            },
            totalTransactions: 0,
            averageCompletion: 0,
          });
        })
      );

      renderInWhitelabel("filecoin");

      expect(await screen.findByText("55 / 137")).toBeInTheDocument();
      expect(screen.getByText("40.1%")).toBeInTheDocument();
      expect(screen.getByText("59.9%")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows placeholder dots when API returns error", async () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        })
      );

      renderWithProviders(<ProjectsStatsSection />);

      await waitFor(
        () => {
          const dots = screen.getAllByText("...");
          expect(dots.length).toBeGreaterThanOrEqual(5);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("section structure", () => {
    it("renders the section heading", async () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return HttpResponse.json({
            totalProjects: 1,
            totalGrants: 1,
            activeCommunities: 1,
            activeBuilders: 1,
            totalProjectUpdates: 1,
            totalMilestones: 1,
            totalCompletedMilestones: 1,
          });
        })
      );

      renderWithProviders(<ProjectsStatsSection />);

      await waitFor(() => {
        expect(screen.getByText("Karma by the Numbers")).toBeInTheDocument();
      });
    });
  });
});
