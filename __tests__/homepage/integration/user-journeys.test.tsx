/**
 * Homepage User Journeys Integration Tests
 * Tests complete user flows through the main homepage (funder-facing)
 *
 * Target: 13 tests
 * - First-Time Visitor (5)
 * - Funder Journey (4)
 * - Page Structure (4)
 */

import HomePage from "@/app/page";
import { renderWithProviders, screen, waitFor } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Mock SOCIALS utility
vi.mock("@/utilities/socials", () => ({
  SOCIALS: {
    PARTNER_FORM: "https://forms.example.com/partner",
    DISCORD: "https://discord.gg/karmahq",
  },
}));

// Mock PAGES utility
vi.mock("@/utilities/pages", () => ({
  PAGES: {
    COMMUNITIES: "/communities",
    COMMUNITY: {
      ALL_GRANTS: (slug: string) => `/community/${slug}/grants`,
    },
    REGISTRY: {
      ROOT: "/funding-map",
    },
    FUNDERS: "/funders",
    PROJECTS_EXPLORER: "/projects",
  },
}));

// Mock auth states
const createMockUseAuth = (overrides = {}) => ({
  ready: true,
  authenticated: false,
  isConnected: false,
  address: undefined,
  user: null,
  authenticate: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  disconnect: vi.fn(),
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
  ...overrides,
});

describe("Homepage User Journeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("First-Time Visitor", () => {
    it("should see hero section on load", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      // Hero heading
      expect(screen.getByText(/AI powered funding software/i)).toBeInTheDocument();
    });

    it("should be able to scroll through content", async () => {
      const { container } = renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      const main = container.querySelector("main");
      expect(main).toHaveClass("flex-col");

      // All sections should be in the DOM for scrolling
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it("should see 'Schedule a Demo' CTA", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      const demoLinks = screen.getAllByRole("link", { name: /Schedule a Demo/i });
      expect(demoLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should be able to explore organizations", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      const orgLinks = screen.getAllByRole("link", { name: /Explore Organizations/i });
      expect(orgLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should access FAQ for help", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      // FAQ section should be visible
      await waitFor(() => {
        expect(screen.getByText(/What is Karma\?/i)).toBeInTheDocument();
      });
    });
  });

  describe("Funder Journey", () => {
    it("should see 'Schedule a Demo' CTA", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      const demoLinks = screen.getAllByRole("link", { name: /Schedule a Demo/i });
      expect(demoLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should be able to navigate to organizations page", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      const orgLinks = screen.getAllByRole("link", { name: /Explore Organizations/i });
      expect(orgLinks.length).toBeGreaterThanOrEqual(1);
      expect(orgLinks[0]).toHaveAttribute("href", "/communities");
    });

    it("should see platform benefits", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      // AI powered description
      expect(screen.getByText(/AI powered funding software/i)).toBeInTheDocument();
    });

    it("should see FAQ with funder-focused questions", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      // FAQ section
      await waitFor(() => {
        expect(screen.getByText(/What is Karma\?/i)).toBeInTheDocument();
      });
    });
  });

  describe("Page Structure", () => {
    it("should have main element with correct layout", async () => {
      const { container } = renderWithProviders(await HomePage());

      const main = container.querySelector("main");
      expect(main).toHaveClass("flex");
      expect(main).toHaveClass("flex-col");
    });

    it("should have multiple sections", async () => {
      const { container } = renderWithProviders(await HomePage());

      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it("should have horizontal dividers between sections", async () => {
      const { container } = renderWithProviders(await HomePage());

      const dividers = container.querySelectorAll("hr");
      expect(dividers.length).toBeGreaterThanOrEqual(3);
    });

    it("should have all content inside main", async () => {
      const { container } = renderWithProviders(await HomePage());

      const main = container.querySelector("main");
      const links = main?.querySelectorAll("a");
      expect(links?.length).toBeGreaterThan(0);
    });
  });
});
