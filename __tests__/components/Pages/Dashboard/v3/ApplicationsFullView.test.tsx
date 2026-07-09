import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationsFullView } from "@/components/Pages/Dashboard/v3/ApplicationsFullView";
import type { UseUserApplicationsReturn } from "@/features/user-applications/types";
import type { Application } from "@/types/whitelabel-entities";

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

vi.mock("@/src/features/application-lookup/components/ApplicationLookupModal", () => ({
  ApplicationLookupModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="lookup-modal">lookup</div> : null,
}));

// Radix Select is portal/pointer-driven and awkward in jsdom; mock it to a
// native <select> (the same convention used by ReviewerPickerModal's tests).
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      aria-label="Filter by status"
      onChange={(e) => onValueChange(e.target.value)}
      value={value}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    referenceNumber: "REF-001",
    programId: "prog-1",
    programTitle: "Builder Grant",
    status: "pending",
    statusHistory: [],
    applicationData: {},
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    communitySlug: "octant",
    communityName: "Octant",
    ...overrides,
  }) as Application;

const makeHook = (
  overrides: Partial<UseUserApplicationsReturn> = {}
): UseUserApplicationsReturn => ({
  applications: [],
  filters: { status: "all" },
  sortBy: "createdAt",
  sortOrder: "desc",
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  statusCounts: {},
  isLoading: false,
  error: null,
  setFilters: vi.fn(),
  setSort: vi.fn(),
  setPage: vi.fn(),
  setPageSize: vi.fn(),
  refresh: vi.fn(),
  ...overrides,
});

function renderView(hook: UseUserApplicationsReturn, communitySlug?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApplicationsFullView applicationsHook={hook} communitySlug={communitySlug} />
    </QueryClientProvider>
  );
}

describe("ApplicationsFullView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders stat tiles and a list row per application", () => {
    const hook = makeHook({
      applications: [
        app({ resolvedProjectName: "Atlas" }),
        app({ referenceNumber: "REF-002", resolvedProjectName: "Nova" }),
      ],
      statusCounts: { pending: 2, approved: 1, rejected: 1 },
      pagination: { page: 1, limit: 10, total: 4, totalPages: 1 },
    });
    renderView(hook, "octant");

    expect(screen.getByText("My applications")).toBeInTheDocument();

    // Stat tiles: total / pending / approved (counts are unique in this fixture).
    expect(screen.getByText("Total applications")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // A row per application: project-title headline + app-id token.
    expect(screen.getByText("Atlas")).toBeInTheDocument();
    expect(screen.getByText("Nova")).toBeInTheDocument();
    expect(screen.getByText("REF-001")).toBeInTheDocument();
    expect(screen.getByText("REF-002")).toBeInTheDocument();
  });

  it("headlines the project name with the app id, moving the program to the subline", () => {
    const hook = makeHook({
      applications: [
        app({
          resolvedProjectName: "Atlas Protocol",
          programTitle: "Builder Grant",
          referenceNumber: "APP-777",
        }),
      ],
      statusCounts: { pending: 1 },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    renderView(hook, "octant");

    const link = screen.getByRole("link", { name: /Atlas Protocol/ });
    expect(within(link).getByText("Atlas Protocol")).toBeInTheDocument();
    expect(within(link).getByText("APP-777")).toBeInTheDocument();
    expect(within(link).getByText(/Builder Grant/)).toBeInTheDocument();
  });

  it("uses the app id as the headline (once) when the project has no title", () => {
    const hook = makeHook({
      applications: [app({ referenceNumber: "APP-501", programTitle: "Builder Grant" })],
      statusCounts: { pending: 1 },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    renderView(hook, "octant");

    const link = screen.getByRole("link", { name: /APP-501/ });
    // App id is the headline; program + community live in the subline.
    expect(within(link).getByText("APP-501")).toBeInTheDocument();
    expect(within(link).getAllByText("APP-501")).toHaveLength(1);
    expect(within(link).getByText(/Builder Grant/)).toBeInTheDocument();
    expect(within(link).getByText(/Octant/)).toBeInTheDocument();
  });

  it("never uses a scraped community name as the headline", () => {
    const hook = makeHook({
      applications: [
        app({
          referenceNumber: "APP-502",
          // getProjectTitle would scrape this "name" field from the form data.
          applicationData: { name: "Octant" },
          communityName: "Octant",
          programTitle: "Builder Grant",
        }),
      ],
      statusCounts: { pending: 1 },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    renderView(hook, "octant");

    const link = screen.getByRole("link", { name: /APP-502/ });
    // Headline is the app id, not the community name.
    expect(within(link).getByText("APP-502")).toBeInTheDocument();
    // "Octant" only appears inside the subline string, never as a standalone title.
    expect(within(link).queryByText("Octant")).not.toBeInTheDocument();
  });

  it("maps each application status to a badge and links to its detail page", () => {
    const hook = makeHook({
      applications: [app({ status: "approved", programTitle: "Approved Grant" })],
      statusCounts: { approved: 1 },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    renderView(hook, "octant");

    const link = screen.getByRole("link", { name: /Approved Grant/ });
    expect(within(link).getByText("Approved")).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/community/octant/applications/REF-001");
  });

  it("renders skeletons while loading", () => {
    const { container } = renderView(makeHook({ isLoading: true }), "octant");
    expect(container.querySelectorAll(".animate-dashv3-pulse").length).toBeGreaterThan(0);
  });

  it("renders an empty state whose lookup link opens the modal", () => {
    renderView(makeHook(), "octant");

    expect(screen.getByText("No applications yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore programs/ })).toBeInTheDocument();

    expect(screen.queryByTestId("lookup-modal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Look it up/));
    expect(screen.getByTestId("lookup-modal")).toBeInTheDocument();
  });

  it("hides the lookup link when not community-scoped", () => {
    renderView(makeHook());
    expect(screen.getByText("No applications yet")).toBeInTheDocument();
    expect(screen.queryByText(/Look it up/)).not.toBeInTheDocument();
  });

  it("surfaces an error with a retry that refreshes", () => {
    const refresh = vi.fn();
    renderView(makeHook({ error: new Error("boom"), refresh }), "octant");

    expect(
      screen.getByText("We could not fetch your applications. We've been notified.")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refresh).toHaveBeenCalled();
  });

  it("paginates when there is more than one page", () => {
    const setPage = vi.fn();
    const hook = makeHook({
      applications: [app()],
      statusCounts: { pending: 1 },
      pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
      setPage,
    });
    renderView(hook, "octant");

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("shows the search + status filter bar when there are applications", () => {
    const hook = makeHook({
      applications: [app()],
      statusCounts: { pending: 1 },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    renderView(hook, "octant");

    expect(screen.getByPlaceholderText("Search applications...")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by status")).toBeInTheDocument();
  });

  it("debounces search input into the store filters", async () => {
    const setFilters = vi.fn();
    const hook = makeHook({
      applications: [app()],
      statusCounts: { pending: 1 },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      setFilters,
    });
    renderView(hook, "octant");

    fireEvent.change(screen.getByPlaceholderText("Search applications..."), {
      target: { value: "atlas" },
    });
    await waitFor(() => expect(setFilters).toHaveBeenCalledWith({ searchQuery: "atlas" }));
  });

  it("applies a status filter immediately", () => {
    const setFilters = vi.fn();
    const hook = makeHook({
      applications: [app()],
      statusCounts: { pending: 1 },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      setFilters,
    });
    renderView(hook, "octant");

    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "approved" } });
    expect(setFilters).toHaveBeenCalledWith({ status: "approved" });
  });

  it("clears active filters via the Clear button", () => {
    const setFilters = vi.fn();
    const hook = makeHook({
      applications: [app()],
      statusCounts: { pending: 1 },
      filters: { status: "approved" },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      setFilters,
    });
    renderView(hook, "octant");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(setFilters).toHaveBeenCalledWith({
      status: "all",
      programId: undefined,
      searchQuery: "",
      dateRange: undefined,
    });
  });

  it("shows a filtered-empty message (not the get-started empty) when a filter matches nothing", () => {
    const hook = makeHook({
      applications: [],
      statusCounts: {},
      filters: { status: "approved" },
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    renderView(hook, "octant");

    expect(screen.getByText("No applications match your filters")).toBeInTheDocument();
    expect(screen.queryByText("No applications yet")).not.toBeInTheDocument();
    // Filter bar remains so the user can clear the filter.
    expect(screen.getByPlaceholderText("Search applications...")).toBeInTheDocument();
  });

  it("hides the filter bar on the get-started empty state", () => {
    renderView(makeHook(), "octant");
    expect(screen.getByText("No applications yet")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search applications...")).not.toBeInTheDocument();
  });

  it("resets the shared filters on unmount so they can't leak into the overview tile", () => {
    const setFilters = vi.fn();
    const hook = makeHook({
      applications: [app()],
      statusCounts: { pending: 1 },
      filters: { status: "approved" },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      setFilters,
    });
    const { unmount } = renderView(hook, "octant");

    // The store filters are shared with the compact overview tile; leaving the
    // drill-in must clear them so a drill-in filter doesn't strand the tile in a
    // misleading filtered-empty state.
    setFilters.mockClear();
    unmount();
    expect(setFilters).toHaveBeenCalledWith({
      status: "all",
      programId: undefined,
      searchQuery: "",
      dateRange: undefined,
    });
  });
});
