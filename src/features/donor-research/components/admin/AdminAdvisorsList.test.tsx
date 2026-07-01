import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminAdvisor } from "@/types/donor-research";

const useAdminAdvisorsMock = vi.fn();

vi.mock("@/hooks/useAdminDonorResearch", () => ({
  useAdminAdvisors: (options: unknown) => useAdminAdvisorsMock(options),
}));

// nuqs needs a Next adapter at runtime; stub to a fixed page for the unit test.
vi.mock("nuqs", () => ({
  useQueryState: () => [1, vi.fn()],
}));

// Link needs router context; render a plain anchor.
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { AdminAdvisorsList } from "./AdminAdvisorsList";

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

describe("AdminAdvisorsList", () => {
  afterEach(() => {
    useAdminAdvisorsMock.mockReset();
  });

  it("renders a skeleton while loading", () => {
    useAdminAdvisorsMock.mockReturnValue({ isLoading: true, isError: false });

    render(<AdminAdvisorsList />);

    expect(
      screen.getByRole("heading", { name: /nonprofit research — advisors/i })
    ).toBeInTheDocument();
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

  it("renders an empty state when there are no advisors", () => {
    useAdminAdvisorsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { items: [], total: 0, page: 1, limit: 20 },
    });

    render(<AdminAdvisorsList />);

    expect(screen.getByText(/no advisors have onboarded yet/i)).toBeInTheDocument();
  });

  it("renders advisors with their email and a report link", () => {
    useAdminAdvisorsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { items: [buildAdvisor()], total: 1, page: 1, limit: 20 },
    });

    render(<AdminAdvisorsList />);

    expect(screen.getByText("avery@example.com")).toBeInTheDocument();
    expect(screen.getByText("Smith Family")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/admin/nonprofit-research/r1");
  });

  it("shows a fallback when an advisor has no email", () => {
    useAdminAdvisorsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { items: [buildAdvisor({ email: null })], total: 1, page: 1, limit: 20 },
    });

    render(<AdminAdvisorsList />);

    expect(screen.getByText(/no email on file/i)).toBeInTheDocument();
  });
});
