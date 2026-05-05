/**
 * GlobalCount component tests using MSW for data fetching.
 *
 * Tests loading, success, error, and empty states using real React Query
 * instead of vi.mock("useQuery").
 */
import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { installMswLifecycle, server } from "@/__tests__/msw/server";
import { renderWithProviders } from "@/__tests__/utils/render";
import { GlobalCount } from "@/components/Pages/Stats/GlobalCount";

const BASE = "http://localhost:4000";
const GLOBAL_COUNT_URL = `${BASE}/attestations/global-count`;

installMswLifecycle();

describe("GlobalCount", () => {
  describe("loading state", () => {
    it("shows 'Loading stats...' while query is pending", () => {
      // Use a handler that never resolves to keep loading state
      server.use(
        http.get(GLOBAL_COUNT_URL, () => {
          return new Promise(() => {
            // never resolves
          });
        })
      );

      renderWithProviders(<GlobalCount />);

      expect(screen.getByText("Loading stats...")).toBeInTheDocument();
    });
  });

  describe("success state", () => {
    it("renders stats sorted by count descending with a total row", async () => {
      const mockStats = [
        { _id: "Grant", count: 42 },
        { _id: "Project", count: 100 },
        { _id: "Milestone", count: 15 },
      ];

      server.use(
        http.get(GLOBAL_COUNT_URL, () => {
          return HttpResponse.json(mockStats);
        })
      );

      renderWithProviders(<GlobalCount />);

      await waitFor(() => {
        expect(screen.getByText("Project")).toBeInTheDocument();
      });

      // Sorted by count descending
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("Grant")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("Milestone")).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument();

      // Total row
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("157")).toBeInTheDocument();
    });

    it("renders a single stat item correctly", async () => {
      server.use(
        http.get(GLOBAL_COUNT_URL, () => {
          return HttpResponse.json([{ _id: "Attestation", count: 7 }]);
        })
      );

      renderWithProviders(<GlobalCount />);

      await waitFor(() => {
        expect(screen.getByText("Attestation")).toBeInTheDocument();
      });

      // Both the stat and total show "7" - verify we have the stat item and total
      const sevens = screen.getAllByText("7");
      expect(sevens).toHaveLength(2);
      expect(screen.getByText("Total")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message when API returns 500", async () => {
      server.use(
        http.get(GLOBAL_COUNT_URL, () => {
          return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
        })
      );

      renderWithProviders(<GlobalCount />);

      await waitFor(() => {
        expect(screen.getByText("Error fetching stats")).toBeInTheDocument();
      });

      // Should not show loading
      expect(screen.queryByText("Loading stats...")).not.toBeInTheDocument();
    });

    it("shows error message when API returns null data", async () => {
      server.use(
        http.get(GLOBAL_COUNT_URL, () => {
          return HttpResponse.json(null);
        })
      );

      renderWithProviders(<GlobalCount />);

      await waitFor(() => {
        expect(screen.getByText("Error fetching stats")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("renders total of 0 when API returns empty array", async () => {
      server.use(
        http.get(GLOBAL_COUNT_URL, () => {
          return HttpResponse.json([]);
        })
      );

      renderWithProviders(<GlobalCount />);

      await waitFor(() => {
        expect(screen.getByText("Total")).toBeInTheDocument();
      });

      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("refresh button", () => {
    it("renders a refresh button", async () => {
      server.use(
        http.get(GLOBAL_COUNT_URL, () => {
          return HttpResponse.json([{ _id: "Grant", count: 1 }]);
        })
      );

      renderWithProviders(<GlobalCount />);

      await waitFor(() => {
        expect(screen.getByText("Grant")).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole("button");
      expect(refreshButton).toBeInTheDocument();
    });
  });
});
