import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminAdvisor, AdminAdvisorStats } from "@/types/donor-research";

const useAdminAdvisorsMock = vi.fn();
// Mutable so a test can drive the "q" (search) query-state value.
let mockSearchValue = "";

vi.mock("@/hooks/useAdminDonorResearch", () => ({
  useAdminAdvisors: (options: unknown) => useAdminAdvisorsMock(options),
}));

// Stub nuqs per key: "q" → the search string, anything else (page) → 1.
vi.mock("nuqs", () => ({
  useQueryState: (key: string) => (key === "q" ? [mockSearchValue, vi.fn()] : [1, vi.fn()]),
}));

// Link needs router context; render a plain anchor.
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { AdminAdvisorsList } from "./AdminAdvisorsList";

const STATS: AdminAdvisorStats = {
  advisors: 3,
  betaAdvisors: 1,
  donors: 5,
  reports: 8,
  completedReports: 6,
  sharedReports: 2,
};

function buildAdvisor(overrides: Partial<AdminAdvisor> = {}): AdminAdvisor {
  return {
    id: "advisor-1",
    walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    email: "avery@example.com",
    name: "Avery",
    displayName: "Avery Boutique",
    orgName: "Boutique Philanthropy",
    timezone: "UTC",
    rateLimitTier: "beta",
    createdAt: "2026-06-03T00:00:00.000Z",
    donorCount: 1,
    reportCount: 1,
    donors: [
      {
        handleId: "h1",
        opaqueLabel: "Smith Family",
        reportCount: 1,
        reports: [
          {
            id: "r1",
            mode: "fast",
            status: "complete",
            createdAt: "2026-06-03T00:00:00.000Z",
            hasShareToken: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function withData(items: AdminAdvisor[]) {
  return {
    isLoading: false,
    isError: false,
    data: { items, total: items.length, stats: STATS, page: 1, limit: 20 },
  };
}

describe("AdminAdvisorsList", () => {
  afterEach(() => {
    useAdminAdvisorsMock.mockReset();
    mockSearchValue = "";
  });

  it("renders the heading and search box", () => {
    useAdminAdvisorsMock.mockReturnValue({ isLoading: true, isError: false });

    render(<AdminAdvisorsList />);

    expect(screen.getByRole("heading", { name: /donor advisors/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search advisors/i })).toBeInTheDocument();
  });

  it("passes the search term to the query", () => {
    mockSearchValue = "smith";
    useAdminAdvisorsMock.mockReturnValue({ isLoading: true, isError: false });

    render(<AdminAdvisorsList />);

    expect(useAdminAdvisorsMock).toHaveBeenCalledWith(expect.objectContaining({ search: "smith" }));
  });

  it("renders global stat cards", () => {
    useAdminAdvisorsMock.mockReturnValue(withData([buildAdvisor()]));

    render(<AdminAdvisorsList />);

    expect(screen.getByText("Reports generated")).toBeInTheDocument();
    expect(screen.getByText("1 in beta")).toBeInTheDocument();
  });

  it("renders a retry affordance on error", () => {
    useAdminAdvisorsMock.mockReturnValue({
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<AdminAdvisorsList />);

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", () => {
    useAdminAdvisorsMock.mockReturnValue(withData([]));

    render(<AdminAdvisorsList />);

    expect(screen.getByText(/no advisors match your search/i)).toBeInTheDocument();
  });

  it("shows the advisor email collapsed and reveals donors + report link on expand", () => {
    useAdminAdvisorsMock.mockReturnValue(withData([buildAdvisor()]));

    render(<AdminAdvisorsList />);

    // Collapsed: header shows the email; donor/report are hidden.
    expect(screen.getByText("avery@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Smith Family")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /avery/i }));

    expect(screen.getByText("Smith Family")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view/i })).toHaveAttribute(
      "href",
      "/admin/nonprofit-research/r1"
    );
  });

  it("shows a fallback when an advisor has no email", () => {
    useAdminAdvisorsMock.mockReturnValue(withData([buildAdvisor({ email: null })]));

    render(<AdminAdvisorsList />);

    expect(screen.getByText(/no email on file/i)).toBeInTheDocument();
  });
});
