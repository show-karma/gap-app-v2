/**
 * AdminSection dashboard integration tests using MSW for data fetching.
 *
 * Tests the AdminSection component with real useDashboardAdmin hook
 * and MSW-intercepted API calls for admin communities and metrics.
 * Verifies loading, success, error, and empty states based on user role.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { createMockCommunity } from "@/__tests__/factories/community.factory";
import { resetSeq } from "@/__tests__/factories/utils";
import { installMswLifecycle, server } from "@/__tests__/msw/server";
import { renderWithProviders } from "@/__tests__/utils/render";
import { AdminSection } from "@/components/Pages/Dashboard/AdminSection/AdminSection";

const BASE = "http://localhost:4000";

// Mock auth — AdminSection's hook checks authenticated + address
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    authenticated: true,
    address: "0x1234567890abcdef1234567890abcdef12345678",
    ready: true,
  })),
}));

// Mock whitelabel context
vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: vi.fn(() => ({
    isWhitelabel: false,
    communitySlug: null,
  })),
}));

// Mock ProfilePicture — heavy component not relevant to data flow
vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name }: { name: string }) => <div data-testid={`avatar-${name}`} />,
}));

// Mock next/link for Link component
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

installMswLifecycle();

describe("AdminSection (MSW integration)", () => {
  beforeEach(() => {
    resetSeq();
  });

  describe("loading state", () => {
    it("shows skeleton cards while admin communities are loading", () => {
      server.use(
        http.get(`${BASE}/v2/user/communities/admin`, () => {
          return new Promise(() => {});
        })
      );

      const { container } = renderWithProviders(<AdminSection />);

      // Should show "My Communities" heading
      expect(screen.getByText("My Communities")).toBeInTheDocument();

      // Should show skeleton cards (animate-pulse)
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("success state", () => {
    it("renders community cards with names and metrics", async () => {
      const community = createMockCommunity({
        uid: "0xcommunity001" as `0x${string}`,
        details: {
          name: "Optimism Grants",
          slug: "optimism-grants",
          imageURL: "https://example.com/op.png",
        },
        chainID: 10,
      });

      server.use(
        http.get(`${BASE}/v2/user/communities/admin`, () => {
          return HttpResponse.json({
            communities: [community],
          });
        }),
        http.get(`${BASE}/v2/communities/:communityId/metrics`, () => {
          return HttpResponse.json({
            communityUID: community.uid,
            totalPrograms: 5,
            enabledPrograms: 3,
            totalApplications: 20,
            approvedApplications: 10,
            rejectedApplications: 2,
            pendingApplications: 8,
            revisionRequestedApplications: 0,
            underReviewApplications: 0,
          });
        })
      );

      renderWithProviders(<AdminSection />);

      await waitFor(() => {
        expect(screen.getByText("Optimism Grants")).toBeInTheDocument();
      });

      // Check metrics are rendered
      expect(screen.getByText("3 active programs")).toBeInTheDocument();
      expect(screen.getByText("8 pending applications")).toBeInTheDocument();

      // Check manage link
      const manageLink = screen.getByRole("link", { name: "Manage" });
      expect(manageLink).toHaveAttribute("href", "/community/optimism-grants/manage");
    });

    it("shows singular form for 1 program and 1 application", async () => {
      const community = createMockCommunity({
        uid: "0xcommunity002" as `0x${string}`,
        details: {
          name: "Solo Community",
          slug: "solo-community",
        },
      });

      server.use(
        http.get(`${BASE}/v2/user/communities/admin`, () => {
          return HttpResponse.json({
            communities: [community],
          });
        }),
        http.get(`${BASE}/v2/communities/:communityId/metrics`, () => {
          return HttpResponse.json({
            communityUID: community.uid,
            totalPrograms: 1,
            enabledPrograms: 1,
            totalApplications: 1,
            approvedApplications: 0,
            rejectedApplications: 0,
            pendingApplications: 1,
            revisionRequestedApplications: 0,
            underReviewApplications: 0,
          });
        })
      );

      renderWithProviders(<AdminSection />);

      await waitFor(() => {
        expect(screen.getByText("Solo Community")).toBeInTheDocument();
      });

      expect(screen.getByText("1 active program")).toBeInTheDocument();
      expect(screen.getByText("1 pending application")).toBeInTheDocument();
    });

    it("renders multiple community cards", async () => {
      const communities = [
        createMockCommunity({
          uid: "0xcommunityA01" as `0x${string}`,
          details: { name: "Arbitrum DAO", slug: "arbitrum-dao" },
          chainID: 42161,
        }),
        createMockCommunity({
          uid: "0xcommunityB02" as `0x${string}`,
          details: { name: "Base Grants", slug: "base-grants" },
          chainID: 8453,
        }),
      ];

      server.use(
        http.get(`${BASE}/v2/user/communities/admin`, () => {
          return HttpResponse.json({ communities });
        }),
        http.get(`${BASE}/v2/communities/:communityId/metrics`, () => {
          return HttpResponse.json({
            totalPrograms: 2,
            enabledPrograms: 2,
            totalApplications: 5,
            pendingApplications: 0,
            approvedApplications: 5,
            rejectedApplications: 0,
            revisionRequestedApplications: 0,
            underReviewApplications: 0,
          });
        })
      );

      renderWithProviders(<AdminSection />);

      await waitFor(() => {
        expect(screen.getByText("Arbitrum DAO")).toBeInTheDocument();
      });

      expect(screen.getByText("Base Grants")).toBeInTheDocument();
      const manageLinks = screen.getAllByRole("link", { name: "Manage" });
      expect(manageLinks).toHaveLength(2);
    });
  });

  describe("empty state", () => {
    it("renders nothing when user has no admin communities", async () => {
      server.use(
        http.get(`${BASE}/v2/user/communities/admin`, () => {
          return HttpResponse.json({ communities: [] });
        })
      );

      const { container } = renderWithProviders(<AdminSection />);

      await waitFor(() => {
        // Component returns null when no communities — nothing rendered
        expect(container.innerHTML).toBe("");
      });
    });
  });

  describe("error state", () => {
    it("shows error message with retry button when API fails", async () => {
      server.use(
        http.get(`${BASE}/v2/user/communities/admin`, () => {
          return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
        })
      );

      renderWithProviders(<AdminSection />);

      await waitFor(() => {
        expect(screen.getByText("Unable to load your communities.")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("retries fetch when Try again button is clicked", async () => {
      let callCount = 0;

      server.use(
        http.get(`${BASE}/v2/user/communities/admin`, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json({ error: "Server error" }, { status: 500 });
          }
          return HttpResponse.json({
            communities: [
              createMockCommunity({
                uid: "0xcommunityRetry" as `0x${string}`,
                details: {
                  name: "Recovered Community",
                  slug: "recovered",
                },
              }),
            ],
          });
        }),
        http.get(`${BASE}/v2/communities/:communityId/metrics`, () => {
          return HttpResponse.json({
            totalPrograms: 1,
            enabledPrograms: 1,
            totalApplications: 0,
            pendingApplications: 0,
            approvedApplications: 0,
            rejectedApplications: 0,
            revisionRequestedApplications: 0,
            underReviewApplications: 0,
          });
        })
      );

      renderWithProviders(<AdminSection />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText("Unable to load your communities.")).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole("button", { name: /try again/i });
      await userEvent.click(retryButton);

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText("Recovered Community")).toBeInTheDocument();
      });
    });
  });
});
