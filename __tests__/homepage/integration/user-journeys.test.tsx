/**
 * Homepage User Journeys Integration Tests
 * Tests complete visitor flows through the funder-focused home page:
 * hero + two-row "How Karma works" section (Nonprofit Research + Foundations).
 */

import HomePage from "@/app/page";
import { mockAuthState } from "../setup";
import { renderWithProviders, screen, waitFor } from "../utils/test-helpers";
import "@testing-library/jest-dom";

const HERO_SR_TEXT = /Fund nonprofits, projects, and initiatives with AI agents/i;

const AUTHENTICATED_AUTH_STATE = {
  ready: true,
  authenticated: true,
  isConnected: true,
  address: "0x1234567890abcdef1234567890abcdef12345678",
  user: { id: "did:privy:test-user", linkedAccounts: [] },
  authenticate: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  disconnect: vi.fn(),
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
};

const UNAUTHENTICATED_AUTH_STATE = {
  ready: true,
  authenticated: false,
  isConnected: false,
  address: undefined as string | undefined,
  user: null as unknown,
  authenticate: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  disconnect: vi.fn(),
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
};

describe("Homepage User Journeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.current = UNAUTHENTICATED_AUTH_STATE;
  });

  describe("First-Time Visitor", () => {
    it("should see the hero canonical sentence on load", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(HERO_SR_TEXT)).toBeInTheDocument();
    });

    it("should see two primary CTAs above the fold", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getAllByText(/Schedule a demo/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Why funders pick Karma/i).length).toBeGreaterThanOrEqual(1);
    });

    it("should see the trust strip with funding programs kicker", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(/Funding programs running on Karma/i)).toBeInTheDocument();
    });

    it("should see the dual-product section heading", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(screen.getByText(/Find the organizations worth funding\./i)).toBeInTheDocument();
      });
    });

    it("should see both product rows in the workflow section", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(
          screen.getByText(/Generate a donor-ready research brief in 10 minutes/i)
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/AI-powered software for grant programs/i)).toBeInTheDocument();
    });
  });

  describe("Returning authenticated visitor", () => {
    // Goal regression: the homepage must render in the logged-in state. A
    // prior session-restart left tabs with stale chunk refs and surfaced as
    // "Something went wrong" — code-level: the page must render the canonical
    // sentence and both product rows regardless of auth state, so a future
    // change that quietly couples Hero/Workflow to auth would fail this.
    it("should render the hero canonical sentence when authenticated", async () => {
      renderWithProviders(await HomePage(), { mockUseAuth: AUTHENTICATED_AUTH_STATE });
      expect(screen.getByText(HERO_SR_TEXT)).toBeInTheDocument();
    });

    it("should render both product rows when authenticated", async () => {
      renderWithProviders(await HomePage(), { mockUseAuth: AUTHENTICATED_AUTH_STATE });
      await waitFor(() => {
        expect(
          screen.getByText(/Generate a donor-ready research brief in 10 minutes/i)
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/AI-powered software for grant programs/i)).toBeInTheDocument();
    });

    it("should not surface the root error boundary when authenticated", async () => {
      const { container } = renderWithProviders(await HomePage(), {
        mockUseAuth: AUTHENTICATED_AUTH_STATE,
      });
      expect(container).not.toHaveTextContent(/Something went wrong/i);
      expect(container).not.toHaveTextContent(/We encountered an error/i);
    });
  });

  describe("Donor / advisor path", () => {
    it("should route the Nonprofit Research row CTA to /donor-advisors", async () => {
      renderWithProviders(await HomePage());
      const exploreLinks = screen.getAllByRole("link", { name: /Explore Nonprofit Research/i });
      expect(exploreLinks[0]).toHaveAttribute("href", "/donor-advisors");
    });
  });

  describe("Foundation path", () => {
    it("should route the Foundations row CTA to /foundations", async () => {
      renderWithProviders(await HomePage());
      const foundationLinks = screen.getAllByRole("link", {
        name: /See how foundations use Karma/i,
      });
      expect(foundationLinks[0]).toHaveAttribute("href", "/foundations");
    });

    it("should expose at least one Schedule a demo external CTA", async () => {
      renderWithProviders(await HomePage());
      const demoLinks = screen.getAllByRole("link", { name: /Schedule a demo/i });
      const external = demoLinks.find((link) => link.getAttribute("target") === "_blank");
      expect(external).toBeDefined();
    });
  });

  describe("Page Structure", () => {
    it("should render a main element", async () => {
      const { container } = renderWithProviders(await HomePage());
      expect(container.querySelector("main")).toBeInTheDocument();
    });

    it("should render at least two sections", async () => {
      const { container } = renderWithProviders(await HomePage());
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("should render external links with safe rel attributes", async () => {
      const { container } = renderWithProviders(await HomePage());
      const externalLinks = Array.from(container.querySelectorAll('a[target="_blank"]'));
      externalLinks.forEach((link) => {
        const rel = link.getAttribute("rel") || "";
        expect(rel.includes("noopener") || rel.includes("noreferrer")).toBe(true);
      });
    });
  });
});
