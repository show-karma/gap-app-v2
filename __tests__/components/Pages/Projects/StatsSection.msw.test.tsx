/**
 * ProjectsStatsSection component tests using MSW for data fetching.
 *
 * Verifies loading, success, and error states for the global stats
 * displayed on the projects explorer page.
 */
import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { installMswLifecycle, server } from "@/__tests__/msw/server";
import { renderWithProviders } from "@/__tests__/utils/render";
import { ProjectsStatsSection } from "@/components/Pages/Projects/StatsSection";

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt as string} {...props} />
  ),
}));

const BASE = "http://localhost:4000";
const GLOBAL_STATS_URL = `${BASE}/v2/communities/stats`;

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

      // While loading, stat values are "..."
      const dots = screen.getAllByText("...");
      expect(dots.length).toBeGreaterThanOrEqual(4);

      // Pulsing animation should be present
      const pulsing = container.querySelectorAll(".animate-pulse");
      expect(pulsing.length).toBeGreaterThan(0);
    });
  });

  describe("success state", () => {
    it("renders all four stat cards with formatted numbers", async () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return HttpResponse.json({
            totalProjects: 1500,
            totalGrants: 320,
            activeCommunities: 45,
            activeBuilders: 2100,
            totalProjectUpdates: 5000,
          });
        })
      );

      renderWithProviders(<ProjectsStatsSection />);

      await waitFor(() => {
        expect(screen.getByText("1.5k+")).toBeInTheDocument();
      });

      // Check all stat labels
      expect(screen.getByText("Total Projects")).toBeInTheDocument();
      expect(screen.getByText("Grants Tracked")).toBeInTheDocument();
      expect(screen.getByText("Active Communities")).toBeInTheDocument();
      expect(screen.getByText("Active Builders")).toBeInTheDocument();

      // Check formatted values
      expect(screen.getByText("320+")).toBeInTheDocument();
      expect(screen.getByText("45")).toBeInTheDocument();
      expect(screen.getByText("2.1k+")).toBeInTheDocument();
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
          });
        })
      );

      renderWithProviders(<ProjectsStatsSection />);

      await waitFor(() => {
        expect(screen.getByText("2.5M+")).toBeInTheDocument();
      });

      expect(screen.getByText("1.0M+")).toBeInTheDocument();
    });

    it("shows numbers under 1000 as-is", async () => {
      server.use(
        http.get(GLOBAL_STATS_URL, () => {
          return HttpResponse.json({
            totalProjects: 42,
            totalGrants: 10,
            activeCommunities: 3,
            activeBuilders: 99,
            totalProjectUpdates: 50,
          });
        })
      );

      renderWithProviders(<ProjectsStatsSection />);

      await waitFor(() => {
        expect(screen.getByText("42+")).toBeInTheDocument();
      });

      expect(screen.getByText("10+")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("99+")).toBeInTheDocument();
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

      // On error, stats stay undefined so we see "..." placeholders
      // The component does not show an explicit error message;
      // it just never replaces the "..." placeholders.
      // We wait briefly and verify no real numbers appear.
      await waitFor(
        () => {
          // Should still show dots (stats never populated)
          const dots = screen.getAllByText("...");
          expect(dots.length).toBeGreaterThanOrEqual(4);
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
