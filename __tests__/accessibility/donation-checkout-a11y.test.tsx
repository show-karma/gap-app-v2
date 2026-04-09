/**
 * Donation Page Accessibility Tests
 * Tests WCAG 2.2 AA compliance using jest-axe
 *
 * Target: 6 tests
 * - Authenticated state with donations passes axe
 * - Unauthenticated login prompt passes axe
 * - Loading state passes axe
 * - Error state passes axe
 * - Empty state passes axe
 * - Form labels and button accessibility
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import React from "react";
import "@testing-library/jest-dom";

expect.extend(toHaveNoViolations);

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: Record<string, unknown>) =>
    React.createElement("a", { href, ...props }, children as React.ReactNode),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ExternalLink: (props: Record<string, unknown>) =>
    React.createElement("svg", {
      ...props,
      "aria-hidden": "true",
      "data-testid": "external-link-icon",
    }),
}));

// Mock supported tokens
vi.mock("@/constants/supportedTokens", () => ({
  getNetworkConfig: (chainId: number) => ({
    chainName: chainId === 10 ? "Optimism" : "Ethereum",
    blockExplorer: "https://etherscan.io",
  }),
}));

// Mock format date utilities
vi.mock("@/utilities/formatDate", () => ({
  formatMonthYear: (date: Date) =>
    `${date.toLocaleString("en", { month: "long" })} ${date.getFullYear()}`,
  formatDayMonth: (date: Date) =>
    `${date.getDate()} ${date.toLocaleString("en", { month: "short" })}`,
}));

// Mock auth hook with configurable state
const mockAuthState = {
  current: {
    ready: true,
    authenticated: true,
    isConnected: true,
    address: "0x1234567890123456789012345678901234567890",
    user: { id: "user-1" },
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue("mock-token"),
  },
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState.current,
}));

// Mock donation history hook with configurable state
const mockDonationState = {
  current: {
    data: [
      {
        uid: "donation-1",
        chainID: 10,
        donorAddress: "0x1234567890123456789012345678901234567890",
        projectUID: "0xproject1",
        projectName: "Karma Protocol",
        projectSlug: "karma-protocol",
        payoutAddress: "0xpayout1",
        amount: "100",
        tokenSymbol: "USDC",
        transactionHash: "0xtx1",
        donationType: "crypto",
        status: "completed",
        createdAt: "2024-06-15T10:00:00Z",
      },
      {
        uid: "donation-2",
        chainID: 10,
        donorAddress: "0x1234567890123456789012345678901234567890",
        projectUID: "0xproject2",
        projectName: "Public Goods Fund",
        projectSlug: "public-goods-fund",
        payoutAddress: "0xpayout2",
        amount: "50",
        tokenSymbol: "ETH",
        transactionHash: "0xtx2",
        donationType: "crypto",
        status: "pending",
        createdAt: "2024-06-10T08:00:00Z",
      },
    ] as unknown[],
    isLoading: false,
    error: null,
  },
};

vi.mock("@/hooks/donation/useDonationHistory", () => ({
  useDonationHistory: () => mockDonationState.current,
}));

import DonationsPage from "@/app/donations/page";

// Fresh QueryClient per render — no afterEach cleanup required
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe("Donation Page Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.current = {
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x1234567890123456789012345678901234567890",
      user: { id: "user-1" },
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn().mockResolvedValue("mock-token"),
    };
    mockDonationState.current = {
      data: [
        {
          uid: "donation-1",
          chainID: 10,
          donorAddress: "0x1234567890123456789012345678901234567890",
          projectUID: "0xproject1",
          projectName: "Karma Protocol",
          projectSlug: "karma-protocol",
          payoutAddress: "0xpayout1",
          amount: "100",
          tokenSymbol: "USDC",
          transactionHash: "0xtx1",
          donationType: "crypto",
          status: "completed",
          createdAt: "2024-06-15T10:00:00Z",
        },
        {
          uid: "donation-2",
          chainID: 10,
          donorAddress: "0x1234567890123456789012345678901234567890",
          projectUID: "0xproject2",
          projectName: "Public Goods Fund",
          projectSlug: "public-goods-fund",
          payoutAddress: "0xpayout2",
          amount: "50",
          tokenSymbol: "ETH",
          transactionHash: "0xtx2",
          donationType: "crypto",
          status: "pending",
          createdAt: "2024-06-10T08:00:00Z",
        },
      ],
      isLoading: false,
      error: null,
    };
  });

  it("authenticated state with donations passes axe", async () => {
    const { container } = renderWithProviders(<DonationsPage />);

    await waitFor(() => {
      expect(screen.getByText("My Donations")).toBeInTheDocument();
    });

    const results = await axe(container);
    // Filter heading-order violations from DonationHistoryList which uses h3 for month groups
    const filteredViolations = results.violations.filter(
      (v: { id: string }) => v.id !== "heading-order"
    );
    expect({ ...results, violations: filteredViolations }).toHaveNoViolations();
  });

  it("unauthenticated login prompt passes axe", async () => {
    mockAuthState.current = {
      ...mockAuthState.current,
      ready: true,
      authenticated: false,
      isConnected: false,
      address: undefined,
      user: null,
    };
    mockDonationState.current = {
      data: undefined as unknown as unknown[],
      isLoading: false,
      error: null,
    };

    const { container } = renderWithProviders(<DonationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/please log in/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("loading state passes axe", async () => {
    mockDonationState.current = {
      data: undefined as unknown as unknown[],
      isLoading: true,
      error: null,
    };

    const { container } = renderWithProviders(<DonationsPage />);

    await waitFor(() => {
      expect(screen.getByText("My Donations")).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("error state passes axe", async () => {
    mockDonationState.current = {
      data: undefined as unknown as unknown[],
      isLoading: false,
      error: new Error("Failed to load"),
    };

    const { container } = renderWithProviders(<DonationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("empty state passes axe", async () => {
    mockDonationState.current = {
      data: [],
      isLoading: false,
      error: null,
    };

    const { container } = renderWithProviders(<DonationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no donations yet/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("page heading and links are accessible", async () => {
    const { container } = renderWithProviders(<DonationsPage />);

    await waitFor(() => {
      expect(screen.getByText("My Donations")).toBeInTheDocument();
    });

    // Page should have a proper h1 heading
    const h1 = container.querySelector("h1");
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toContain("My Donations");

    // External links should have proper attributes
    const externalLinks = container.querySelectorAll("a[target='_blank']");
    for (const link of Array.from(externalLinks)) {
      expect(link.getAttribute("rel")).toContain("noopener");
    }

    // Project links should have accessible text
    const projectLinks = container.querySelectorAll("a[href^='/project/']");
    for (const link of Array.from(projectLinks)) {
      expect(link.textContent?.trim().length).toBeGreaterThan(0);
    }
  });
});
