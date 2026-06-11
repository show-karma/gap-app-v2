/**
 * Tests for components/CommunityGrantsDonate.tsx
 *
 * Covers the Three States rule for the donation program grid:
 * - loading: shows the CardListSkeleton
 * - empty: shows the empty-state CTA (never returns null)
 * - populated: renders the project grid
 */

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityGrantsDonate } from "@/components/CommunityGrantsDonate";
import { useCommunityProjectsPaginated } from "@/hooks/useCommunityProjectsPaginated";
import { useDonationCart } from "@/store";
import type { CommunityProjects } from "@/types/v2/community";
import { renderWithProviders } from "../utils/render";

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "lisk", programId: "program-1" }),
}));

vi.mock("@/hooks/useCommunityProjectsPaginated", () => ({
  useCommunityProjectsPaginated: vi.fn(),
}));

vi.mock("@/store", () => ({
  useDonationCart: vi.fn(),
}));

vi.mock("@/hooks/useMediaQuery", () => ({ default: () => false }));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/Pages/Communities/Loading", () => ({
  CardListSkeleton: () => <div data-testid="card-list-skeleton" />,
}));

vi.mock("@/components/GrantCard", () => ({
  GrantCard: ({ grant }: { grant: { uid: string } }) => (
    <div data-testid="grant-card">{grant.uid}</div>
  ),
}));

vi.mock("@/components/Donation/ProjectCartButton", () => ({
  ProjectCartButton: () => <button type="button">cart</button>,
}));

vi.mock("@/utilities/adapters/v2/projectToGrant", () => ({
  projectToGrant: (project: { uid: string }) => ({ uid: project.uid }),
}));

// react-virtualized AutoSizer needs a measurable width; force a fixed one so
// the Grid renders cells in jsdom.
vi.mock("react-virtualized", () => ({
  AutoSizer: ({ children }: { children: (size: { width: number }) => React.ReactNode }) =>
    children({ width: 1200 }),
  Grid: ({
    cellRenderer,
    rowCount,
    columnCount,
  }: {
    cellRenderer: (args: {
      columnIndex: number;
      key: string;
      rowIndex: number;
      style: Record<string, number>;
    }) => React.ReactNode;
    rowCount: number;
    columnCount: number;
  }) => (
    <div data-testid="grid">
      {Array.from({ length: rowCount }).flatMap((_, rowIndex) =>
        Array.from({ length: columnCount }).map((__, columnIndex) =>
          cellRenderer({ columnIndex, key: `${rowIndex}-${columnIndex}`, rowIndex, style: {} })
        )
      )}
    </div>
  ),
}));

vi.mock("react-infinite-scroll-component", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUsePaginated = vi.mocked(useCommunityProjectsPaginated);
const mockUseDonationCart = vi.mocked(useDonationCart);

const emptyInitial: CommunityProjects = {
  payload: [],
  pagination: {
    totalCount: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
    nextPage: null,
    prevPage: null,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

// biome-ignore lint/suspicious/noExplicitAny: minimal project fixture for grid rendering
const makeProject = (uid: string): any => ({
  uid,
  chainPayoutAddress: "0xabc",
  details: { title: `Project ${uid}`, slug: `slug-${uid}`, logoUrl: null },
});

function mockPaginated(overrides: Record<string, unknown>) {
  mockUsePaginated.mockReturnValue({
    data: undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    ...overrides,
    // biome-ignore lint/suspicious/noExplicitAny: partial mock of useInfiniteQuery result
  } as any);
}

describe("CommunityGrantsDonate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDonationCart.mockReturnValue({
      items: [],
      toggle: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: partial mock of the cart store
    } as any);
  });

  it("shows the loading skeleton while fetching", () => {
    mockPaginated({ isLoading: true });

    renderWithProviders(<CommunityGrantsDonate initialProjects={emptyInitial} />);

    expect(screen.getByTestId("card-list-skeleton")).toBeInTheDocument();
  });

  it("renders the empty-state CTA when no projects are available (never null)", () => {
    mockPaginated({
      isLoading: false,
      data: { pages: [emptyInitial], pageParams: [1] },
    });

    renderWithProviders(<CommunityGrantsDonate initialProjects={emptyInitial} />);

    expect(
      screen.getByText("No projects are accepting donations in this program yet.")
    ).toBeInTheDocument();
    const cta = screen.getByText("Browse community projects").closest("a");
    expect(cta).toHaveAttribute("href", "/community/lisk/projects");
    expect(screen.queryByTestId("grant-card")).not.toBeInTheDocument();
  });

  it("renders the project grid when projects are available", () => {
    const populated: CommunityProjects = {
      ...emptyInitial,
      payload: [makeProject("a"), makeProject("b")],
    };
    mockPaginated({
      isLoading: false,
      data: { pages: [populated], pageParams: [1] },
    });

    renderWithProviders(<CommunityGrantsDonate initialProjects={emptyInitial} />);

    const cards = screen.getAllByTestId("grant-card");
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByText("No projects are accepting donations in this program yet.")
    ).not.toBeInTheDocument();
  });
});
