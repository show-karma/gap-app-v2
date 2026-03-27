import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { BrowseApplicationsClient } from "@/app/community/[communityId]/(with-header)/browse-applications/BrowseApplicationsClient";

// --- Mocks ---

const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: "/community/test-community/browse-applications",
  }),
  usePathname: () => "/community/test-community/browse-applications",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ communityId: "test-community" }),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/features/programs/hooks/use-programs-with-config", () => ({
  useProgramsWithConfig: vi.fn(() => ({
    programs: [
      {
        programId: "program-abc",
        chainID: 1,
        name: "Test Grant Program",
        applicationConfig: {
          formSchema: { fields: [] },
        },
      },
      {
        programId: "program-xyz",
        chainID: 1,
        name: "Another Program",
        applicationConfig: {
          formSchema: { fields: [] },
        },
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(() =>
    Promise.resolve([
      {
        applications: [],
        pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
      },
      null,
    ])
  ),
}));

vi.mock("@/components/FundingPlatform/helper/getProjectTitle", () => ({
  getProjectTitle: (app: { applicationData?: Record<string, unknown> }) =>
    (app.applicationData?.["Pod Name"] as string) ?? "Untitled",
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/utilities/formatDate", () => ({
  formatDate: (d: string) => d,
}));

vi.mock("lucide-react", () => ({
  Lock: (props: Record<string, unknown>) => <svg data-testid="lock-icon" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="refresh-icon" {...props} />,
  Search: (props: Record<string, unknown>) => <svg data-testid="search-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}));

// --- Helpers ---

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// --- Tests ---

describe("BrowseApplicationsClient - URL sync on filter change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the URL with programId when a program is selected", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    const programSelect = screen.getByLabelText("Funding Program");
    await user.selectOptions(programSelect, "program-abc");

    // The component should call router.replace with the programId in the URL
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("programId=program-abc"),
      expect.anything()
    );
  });

  it("updates the URL with status when status filter changes", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    // First select a program so the status filter is enabled
    const programSelect = screen.getByLabelText("Funding Program");
    await user.selectOptions(programSelect, "program-abc");

    mockRouterReplace.mockClear();

    const statusSelect = screen.getByLabelText("Status");
    await user.selectOptions(statusSelect, "approved");

    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("status=approved"),
      expect.anything()
    );
  });

  it("updates the URL with search term when the user types in the search box", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    // First select a program so the search input is enabled
    const programSelect = screen.getByLabelText("Funding Program");
    await user.selectOptions(programSelect, "program-abc");

    mockRouterReplace.mockClear();

    const searchInput = screen.getByLabelText("Search");
    await user.type(searchInput, "my project");

    // The component should update the URL with the search param
    // (may be debounced, so we check that it was called at some point)
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("search="),
      expect.anything()
    );
  });

  it("reflects combined filter state in the URL", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    const programSelect = screen.getByLabelText("Funding Program");
    await user.selectOptions(programSelect, "program-abc");

    const statusSelect = screen.getByLabelText("Status");
    await user.selectOptions(statusSelect, "pending");

    // The last call to replace should include both programId and status
    expect(mockRouterReplace).toHaveBeenCalled();
    const lastCall = mockRouterReplace.mock.calls[mockRouterReplace.mock.calls.length - 1][0];
    expect(lastCall).toContain("programId=program-abc");
    expect(lastCall).toContain("status=pending");
  });

  it("removes status param from URL when reset to 'all'", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    const programSelect = screen.getByLabelText("Funding Program");
    await user.selectOptions(programSelect, "program-abc");

    const statusSelect = screen.getByLabelText("Status");
    await user.selectOptions(statusSelect, "approved");
    await user.selectOptions(statusSelect, "all");

    expect(mockRouterReplace).toHaveBeenCalled();
    const lastCall = mockRouterReplace.mock.calls[mockRouterReplace.mock.calls.length - 1][0];
    expect(lastCall).not.toContain("status=");
  });

  it('displays requested amount when applicationData has "Funding Request" key', async () => {
    jest
      .spyOn(require("next/navigation"), "useSearchParams")
      .mockReturnValue(new URLSearchParams("programId=program-abc"));

    mockFetchData.mockResolvedValueOnce([
      {
        applications: [
          {
            id: "app-1",
            programId: "program-abc",
            referenceNumber: "APP-TEST01",
            status: "approved",
            applicationData: {
              "Pod Name": "Test Pod",
              "Funding Request": "$466,000 USD",
            },
            createdAt: "2026-02-11T10:36:46.032Z",
            updatedAt: "2026-02-11T10:36:46.032Z",
          },
        ],
        pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
      },
      null,
    ]);

    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    expect(await screen.findByText("$466,000")).toBeInTheDocument();
  });

  it("prefers Funding Request over long question keys that happen to contain amount and funding", async () => {
    jest
      .spyOn(require("next/navigation"), "useSearchParams")
      .mockReturnValue(new URLSearchParams("programId=program-abc"));

    mockFetchData.mockResolvedValueOnce([
      {
        applications: [
          {
            id: "app-2",
            programId: "program-abc",
            referenceNumber: "APP-TEST02",
            status: "approved",
            applicationData: {
              "Pod Name": "LDO Pod",
              // This long question key contains both "funding" and "amount" but is NOT the requested amount
              "Have you received previous Filecoin PGF / PLFIF funding? If yes, specify round, amount, and timing.":
                "FIDL is funded by PL and FF.",
              "Funding Request": "$147,630 USD",
            },
            createdAt: "2026-01-27T00:00:00.000Z",
            updatedAt: "2026-01-27T00:00:00.000Z",
          },
        ],
        pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
      },
      null,
    ]);

    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    // Should show the correct funding amount, NOT "FIDL is funded by PL and FF."
    expect(await screen.findByText("$147,630")).toBeInTheDocument();
    expect(screen.queryByText(/FIDL is funded/)).not.toBeInTheDocument();
  });

  it("extracts the first dollar amount when Funding Request contains a sentence with multiple numbers", async () => {
    jest
      .spyOn(require("next/navigation"), "useSearchParams")
      .mockReturnValue(new URLSearchParams("programId=program-abc"));

    mockFetchData.mockResolvedValueOnce([
      {
        applications: [
          {
            id: "app-3",
            programId: "program-abc",
            referenceNumber: "APP-TEST03",
            status: "pending",
            applicationData: {
              "Pod Name": "Web2 Pod",
              "Funding Request":
                "$239,000 over next three months (Performance/Milestone based $500,236 expected request for second 3-month period)",
            },
            createdAt: "2026-01-28T00:00:00.000Z",
            updatedAt: "2026-01-28T00:00:00.000Z",
          },
        ],
        pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
      },
      null,
    ]);

    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    // Should extract $239,000 (the first dollar amount), NOT concatenate all numbers
    expect(await screen.findByText("$239,000")).toBeInTheDocument();
  });

  it("removes programId from URL when program is deselected", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    const programSelect = screen.getByLabelText("Funding Program");
    await user.selectOptions(programSelect, "program-abc");
    // Deselect by choosing the placeholder option
    await user.selectOptions(programSelect, "");

    expect(mockRouterReplace).toHaveBeenCalled();
    const lastCall = mockRouterReplace.mock.calls[mockRouterReplace.mock.calls.length - 1][0];
    expect(lastCall).not.toContain("programId=");
  });
});
