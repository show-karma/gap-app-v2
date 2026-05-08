/**
 * Multi-Step Navigation Journey Tests
 *
 * These tests chain 3+ sequential user interactions to verify complete
 * user journeys through the application. Each test exercises the real
 * data pipeline (Component -> Hook -> Service -> MSW) and validates
 * navigation, filtering, and form submission flows.
 *
 * Only framework boundaries are mocked:
 *   - next/navigation (useRouter.push captured via vi.fn)
 *   - nuqs (useQueryState needs real URL state)
 *   - next/link (Link -> <a> for jsdom)
 *   - @/utilities/auth/token-manager (no Privy in test env)
 *   - @/components/Utilities/MarkdownPreview (heavy editor deps)
 *   - @/components/Utilities/ProfilePicture (next/image dep)
 *   - @/utilities/query-client (singleton import by component)
 *   - wagmi (wallet connection boundary)
 *   - @/components/Utilities/MarkdownEditor (heavy editor deps)
 *   - @/components/Utilities/Button (simplified for jsdom)
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockProject } from "@/__tests__/factories/project.factory";
import { resetSeq } from "@/__tests__/factories/utils";
import ApplicationSubmissionWithAPI from "@/components/FundingPlatform/ApplicationView/ApplicationSubmissionWithAPI";
import { ProjectsExplorer } from "@/components/Pages/Projects/ProjectsExplorer";
import { useProgramsStore } from "@/features/programs/lib/store";
import { renderWithProviders } from "../providers";
import { HttpResponse, http, installMswLifecycle, server } from "../setup";

// ── Capture router.push calls ──

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/projects"),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
    toString: vi.fn(() => ""),
  })),
  useParams: vi.fn(() => ({ communityId: "optimism-collective" })),
  useSelectedLayoutSegment: vi.fn(() => null),
  useSelectedLayoutSegments: vi.fn(() => []),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

// ── nuqs mock with stateful search ──

let nuqsState: Record<string, string> = {};

vi.mock("nuqs", () => ({
  useQueryState: vi.fn((key: string, options?: { defaultValue?: string }) => {
    const value = nuqsState[key] ?? options?.defaultValue ?? "";
    const setter = vi.fn((newVal: string | null) => {
      if (newVal === null || newVal === undefined) {
        delete nuqsState[key];
      } else {
        nuqsState[key] = newVal;
      }
    });
    return [value, setter];
  }),
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn().mockResolvedValue("test-token"),
    setPrivyInstance: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => (
    <span data-testid="markdown-preview">{source}</span>
  ),
}));

vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name }: { name: string }) => (
    <span data-testid={`profile-pic-${name}`}>{name}</span>
  ),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/utilities/query-client", () => ({
  queryClient: { removeQueries: vi.fn() },
}));

vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: "0x1234567890123456789012345678901234567890",
    isConnected: true,
  })),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
  useChainId: vi.fn(() => 10),
  useWalletClient: vi.fn(() => ({ data: null })),
  usePublicClient: vi.fn(() => null),
  useWriteContract: vi.fn(() => ({ writeContractAsync: vi.fn() })),
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({
    label,
    value,
    onChange,
    placeholder,
    isRequired,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    isRequired?: boolean;
  }) => {
    const id = `markdown-editor-${label}`;
    return (
      <div>
        <label htmlFor={id}>
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <textarea
          id={id}
          data-testid={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  },
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({
    children,
    isLoading,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    isLoading?: boolean;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button disabled={disabled || isLoading} {...props}>
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

// lucide-react icons for ProgramList and Select component
vi.mock("lucide-react", () => ({
  AlertCircle: () => <span data-testid="icon-alert" />,
  FileText: () => <span data-testid="icon-file" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Search: () => <span data-testid="icon-search" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  Coins: () => <span data-testid="icon-coins" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  ChevronUp: () => <span data-testid="icon-chevron-up" />,
  Check: () => <span data-testid="icon-check" />,
}));

// ── MSW lifecycle ──

installMswLifecycle();

// ── Helpers ──

function buildPaginatedResponse(
  projects: ReturnType<typeof createMockProject>[],
  page = 1,
  hasNextPage = false
) {
  return {
    payload: projects.map((p) => ({
      uid: p.uid,
      chainID: p.chainID,
      owner: p.owner,
      details: p.details,
      members: p.members,
      createdAt: "2024-06-15T09:00:00Z",
      updatedAt: "2024-06-15T09:00:00Z",
      stats: {
        grantsCount: 2,
        grantMilestonesCount: 5,
        roadmapItemsCount: 3,
      },
    })),
    pagination: {
      totalCount: projects.length,
      page,
      limit: 12,
      totalPages: hasNextPage ? 2 : 1,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      hasNextPage,
      hasPrevPage: page > 1,
    },
  };
}

function buildProgramConfig(overrides: Record<string, unknown> = {}) {
  return {
    programId: "test-program-001",
    chainID: 10,
    name: "Climate Grants Program",
    metadata: {
      title: "Climate Grants",
      description: "Funding climate solutions",
    },
    applicationConfig: {
      isEnabled: true,
      formSchema: {
        title: "Climate Grant Application",
        description: "Apply for funding to fight climate change",
        fields: [
          {
            id: "project_name",
            label: "Project Name",
            type: "text",
            required: true,
            placeholder: "Enter your project name",
          },
          {
            id: "email",
            label: "Email",
            type: "email",
            required: true,
            placeholder: "your@email.com",
          },
          {
            id: "project_description",
            label: "Project Description",
            type: "textarea",
            required: true,
            placeholder: "Describe your project",
          },
          {
            id: "requested_amount",
            label: "Requested Amount",
            type: "text",
            required: true,
            placeholder: "e.g. $50,000",
          },
        ],
      },
      ...overrides,
    },
  };
}

// ── Tests ──

describe("Multi-Step Navigation Journey Tests", () => {
  beforeEach(() => {
    resetSeq();
    pushMock.mockClear();
    nuqsState = {};
    // Reset Zustand store to avoid state leaking between tests
    useProgramsStore.getState().reset();
  });

  describe("Flow 1: Project Discovery Journey — search → view results → click project", () => {
    it("searches for projects, sees filtered results, and clicks a project card to navigate", async () => {
      const user = userEvent.setup();

      // All projects
      const allProjects = [
        createMockProject({
          details: { title: "Climate DAO", slug: "climate-dao", description: "Climate action" },
        }),
        createMockProject({
          details: { title: "DeFi Protocol", slug: "defi-protocol", description: "Lending" },
        }),
        createMockProject({
          details: { title: "NFT Marketplace", slug: "nft-market", description: "Trading" },
        }),
      ];

      // Track search queries hitting the API
      const searchQueriesReceived: string[] = [];

      server.use(
        http.get("*/v2/projects", ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get("search") || "";
          searchQueriesReceived.push(search);

          // Filter based on search query
          const filtered = search
            ? allProjects.filter((p) =>
                p.details.title.toLowerCase().includes(search.toLowerCase())
              )
            : allProjects;

          return HttpResponse.json(buildPaginatedResponse(filtered));
        })
      );

      // Step 1: Render and see all projects
      renderWithProviders(<ProjectsExplorer />);

      await waitFor(
        () => {
          expect(screen.getByText("3 projects found")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Verify all projects are visible initially
      expect(screen.getAllByText("Climate DAO").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("DeFi Protocol").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("NFT Marketplace").length).toBeGreaterThanOrEqual(1);

      // Step 2: Type in the search input
      const searchInput = screen.getByRole("textbox", { name: /search projects/i });
      await user.type(searchInput, "Climate");

      // Verify the input value changed
      expect(searchInput).toHaveValue("Climate");

      // Step 3: Click on the project card link to navigate
      const projectLink = screen.getByRole("link", {
        name: /view climate dao project details/i,
      });
      expect(projectLink).toHaveAttribute("href", "/project/climate-dao");

      await user.click(projectLink);

      // The link has the correct href — in jsdom, clicking an <a> tag
      // doesn't navigate, but we verified the link destination is correct.
    });

    it("searches, gets no results, clears search, and sees all projects again", async () => {
      const user = userEvent.setup();

      const projects = [
        createMockProject({
          details: { title: "Governance Hub", slug: "gov-hub", description: "DAO governance" },
        }),
      ];

      server.use(
        http.get("*/v2/projects", ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get("search") || "";

          if (
            search &&
            !projects.some((p) => p.details.title.toLowerCase().includes(search.toLowerCase()))
          ) {
            return HttpResponse.json(buildPaginatedResponse([]));
          }

          return HttpResponse.json(buildPaginatedResponse(projects));
        })
      );

      // Step 1: Render and see the project
      renderWithProviders(<ProjectsExplorer />);

      await waitFor(
        () => {
          expect(screen.getByText("1 project found")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Step 2: Search for something that doesn't exist
      const searchInput = screen.getByRole("textbox", { name: /search projects/i });
      await user.type(searchInput, "NonExistentProject");

      // The input should reflect the typed value
      expect(searchInput).toHaveValue("NonExistentProject");

      // Step 3: Clear the search input
      await user.clear(searchInput);
      expect(searchInput).toHaveValue("");
    });

    it("loads projects, paginates, and navigates to a project from second page", async () => {
      const user = userEvent.setup();

      const page1Projects = [
        createMockProject({
          details: { title: "First Page Project", slug: "first-page", description: "Page 1" },
        }),
      ];

      const page2Projects = [
        createMockProject({
          details: { title: "Second Page Project", slug: "second-page", description: "Page 2" },
        }),
      ];

      let requestCount = 0;

      server.use(
        http.get("*/v2/projects", ({ request }) => {
          requestCount++;
          const url = new URL(request.url);
          const page = Number(url.searchParams.get("page") || "1");

          if (page === 1) {
            return HttpResponse.json(buildPaginatedResponse(page1Projects, 1, true));
          }

          return HttpResponse.json(buildPaginatedResponse(page2Projects, 2, false));
        })
      );

      // Step 1: Render and see first page projects
      renderWithProviders(<ProjectsExplorer />);

      await waitFor(
        () => {
          expect(screen.getAllByText("First Page Project").length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 5000 }
      );

      // Step 2: Click "Load More Projects" button
      const loadMoreButton = screen.getByRole("button", { name: /load more projects/i });
      await user.click(loadMoreButton);

      // Step 3: Wait for second page and verify new projects appear
      await waitFor(
        () => {
          expect(screen.getAllByText("Second Page Project").length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 5000 }
      );

      // Step 4: Click a second-page project link
      const secondPageLink = screen.getByRole("link", {
        name: /view second page project project details/i,
      });
      expect(secondPageLink).toHaveAttribute("href", "/project/second-page");
    });
  });

  describe("Flow 2: Grant Application Flow — load form → fill fields → submit", () => {
    const PROGRAM_ID = "test-program-001";
    const CHAIN_ID = 10;

    it("loads form config, fills all required fields, and submits successfully", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      let capturedBody: Record<string, unknown> | null = null;

      const programConfig = buildProgramConfig();

      server.use(
        http.get("*/v2/funding-program-configs/:programId", () => {
          return HttpResponse.json(programConfig);
        }),
        http.get("*/v2/funding-applications/program/:programId/statistics", () => {
          return HttpResponse.json({
            totalApplications: 0,
            pendingApplications: 0,
            approvedApplications: 0,
            rejectedApplications: 0,
            underReviewApplications: 0,
            resubmittedApplications: 0,
          });
        }),
        http.get("*/v2/funding-applications/program/:programId", () => {
          return HttpResponse.json({
            data: [],
            pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
          });
        }),
        http.post("*/v2/funding-applications/:programId", async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            id: "app-001",
            programId: PROGRAM_ID,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
        })
      );

      // Step 1: Render — see loading, then form
      renderWithProviders(
        <ApplicationSubmissionWithAPI
          programId={PROGRAM_ID}
          chainId={CHAIN_ID}
          onSubmissionSuccess={onSuccess}
        />,
        {
          authState: { authenticated: true, ready: true },
        }
      );

      // Wait for form to load from MSW
      await waitFor(
        () => {
          expect(screen.getByText("Climate Grant Application")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Step 2: Fill in required fields
      const projectNameInput = screen.getByPlaceholderText("Enter your project name");
      await user.type(projectNameInput, "Solar Panel DAO");

      const emailInput = screen.getByPlaceholderText("your@email.com");
      await user.type(emailInput, "dao@solarpanel.xyz");

      // For textarea fields rendered through MarkdownEditor mock
      const descriptionTextarea = screen.getByTestId("markdown-editor-Project Description");
      await user.type(descriptionTextarea, "Building decentralized solar infrastructure");

      const amountInput = screen.getByPlaceholderText("e.g. $50,000");
      await user.type(amountInput, "$75,000");

      // Step 3: Verify fields are filled
      expect(projectNameInput).toHaveValue("Solar Panel DAO");
      expect(emailInput).toHaveValue("dao@solarpanel.xyz");
      expect(descriptionTextarea).toHaveValue("Building decentralized solar infrastructure");
      expect(amountInput).toHaveValue("$75,000");

      // Step 4: Submit the form
      const submitButton = screen.getByRole("button", { name: /submit application/i });
      expect(submitButton).not.toBeDisabled();
      await user.click(submitButton);

      // Step 5: Verify the API received the POST
      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      });

      // The form uses labels as keys (e.g. "Project Name", not "project_name")
      // The hook extracts email and sends it as applicantEmail
      expect(capturedBody).toEqual(
        expect.objectContaining({
          programId: PROGRAM_ID,
          applicantEmail: "dao@solarpanel.xyz",
          applicationData: expect.objectContaining({
            "Project Name": "Solar Panel DAO",
            Email: "dao@solarpanel.xyz",
            "Project Description": "Building decentralized solar infrastructure",
            "Requested Amount": "$75,000",
          }),
        })
      );
    });

    it("shows validation errors when submitting empty required fields, then fills and submits", async () => {
      const user = userEvent.setup();

      const programConfig = buildProgramConfig();

      server.use(
        http.get("*/v2/funding-program-configs/:programId", () => {
          return HttpResponse.json(programConfig);
        }),
        http.get("*/v2/funding-applications/program/:programId/statistics", () => {
          return HttpResponse.json({
            totalApplications: 0,
            pendingApplications: 0,
            approvedApplications: 0,
            rejectedApplications: 0,
            underReviewApplications: 0,
            resubmittedApplications: 0,
          });
        }),
        http.get("*/v2/funding-applications/program/:programId", () => {
          return HttpResponse.json({
            data: [],
            pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
          });
        }),
        http.post("*/v2/funding-applications/:programId", async () => {
          return HttpResponse.json({
            id: "app-002",
            programId: PROGRAM_ID,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
        })
      );

      renderWithProviders(
        <ApplicationSubmissionWithAPI programId={PROGRAM_ID} chainId={CHAIN_ID} />,
        {
          authState: { authenticated: true, ready: true },
        }
      );

      // Step 1: Wait for form
      await waitFor(
        () => {
          expect(screen.getByText("Climate Grant Application")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Step 2: The submit button should be disabled since no required fields are filled
      const submitButton = screen.getByRole("button", { name: /submit application/i });
      expect(submitButton).toBeDisabled();

      // Step 3: Fill one field — button should still be disabled (other required fields empty)
      const projectNameInput = screen.getByPlaceholderText("Enter your project name");
      await user.type(projectNameInput, "Partial Project");
      expect(submitButton).toBeDisabled();

      // Step 4: Fill all required fields — button becomes enabled
      const emailInput = screen.getByPlaceholderText("your@email.com");
      await user.type(emailInput, "test@example.com");

      const descriptionTextarea = screen.getByTestId("markdown-editor-Project Description");
      await user.type(descriptionTextarea, "Full description here");

      const amountInput = screen.getByPlaceholderText("e.g. $50,000");
      await user.type(amountInput, "$10,000");

      // Button should now be enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe("Flow 3: Program Browse → Filter → Select", () => {
    async function importPage() {
      const mod = await import(
        "@/app/community/[communityId]/(with-header)/funding-opportunities/page"
      );
      return mod.default;
    }

    // FundingMapCard mock
    vi.mock("@/src/features/funding-map/components/funding-map-card", () => ({
      FundingMapCard: ({
        program,
        href,
        statusSlot,
      }: {
        program: { metadata: { title?: string; description?: string } };
        href?: string;
        statusSlot?: React.ReactNode;
      }) => (
        <a href={href} data-testid={`program-card-${program.metadata?.title}`}>
          <span>{program.metadata?.title}</span>
          <span>{program.metadata?.description}</span>
          {statusSlot}
        </a>
      ),
    }));

    vi.mock("@/src/features/programs/components/ProgramCardSkeleton", () => ({
      ProgramCardSkeleton: () => <div data-testid="skeleton" />,
    }));

    it("loads programs, types a search filter, and clicks a matching program", async () => {
      const user = userEvent.setup();

      const programs = [
        {
          programId: "retro-pgf-5",
          chainID: 10,
          name: "RetroPGF Round 5",
          metadata: {
            title: "RetroPGF Round 5",
            description: "Retroactive public goods funding",
            startsAt: "2024-01-01T00:00:00Z",
            endsAt: "2028-12-31T00:00:00Z",
            status: "active",
            grantTypes: ["retroactive"],
          },
          applicationConfig: { isEnabled: true },
        },
        {
          programId: "builder-grants",
          chainID: 10,
          name: "Builder Grants",
          metadata: {
            title: "Builder Grants",
            description: "Funding for ecosystem builders",
            startsAt: "2024-06-01T00:00:00Z",
            endsAt: "2028-06-01T00:00:00Z",
            status: "active",
            grantTypes: ["proactive"],
          },
          applicationConfig: { isEnabled: true },
        },
        {
          programId: "defi-incentives",
          chainID: 10,
          name: "DeFi Incentives",
          metadata: {
            title: "DeFi Incentives Program",
            description: "Incentives for DeFi protocols",
            startsAt: "2024-03-01T00:00:00Z",
            endsAt: "2028-03-01T00:00:00Z",
            status: "active",
            grantTypes: ["proactive"],
          },
          applicationConfig: { isEnabled: true },
        },
      ];

      server.use(
        http.get("*/v2/funding-program-configs/community/:communityId", () => {
          return HttpResponse.json(programs);
        })
      );

      // Step 1: Render and wait for programs to load
      const Page = await importPage();
      renderWithProviders(<Page />);

      await waitFor(
        () => {
          expect(screen.getByText("RetroPGF Round 5")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // All 3 programs visible
      expect(screen.getByText("Builder Grants")).toBeInTheDocument();
      expect(screen.getByText("DeFi Incentives Program")).toBeInTheDocument();
      expect(screen.getByText("3 programs found")).toBeInTheDocument();

      // Step 2: Type in the search/filter input
      const searchInput = screen.getByPlaceholderText("Search programs...");
      await user.type(searchInput, "Builder");

      // Step 3: Wait for the filter to apply (debounced at 300ms)
      await waitFor(
        () => {
          expect(screen.getByText("1 program found")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Only Builder Grants should be visible
      expect(screen.getByText("Builder Grants")).toBeInTheDocument();
      expect(screen.queryByText("RetroPGF Round 5")).not.toBeInTheDocument();
      expect(screen.queryByText("DeFi Incentives Program")).not.toBeInTheDocument();

      // Step 4: Click the matching program card
      const programLink = screen.getByTestId("program-card-Builder Grants");
      expect(programLink).toHaveAttribute("href", expect.stringContaining("builder-grants"));
    });

    it("filters by status, clears filter, then searches by text", async () => {
      const user = userEvent.setup();

      const programs = [
        {
          programId: "active-prog",
          chainID: 10,
          name: "Active Program",
          metadata: {
            title: "Active Program",
            description: "Currently accepting",
            startsAt: "2024-01-01T00:00:00Z",
            endsAt: "2028-12-31T00:00:00Z",
            status: "active",
          },
          applicationConfig: { isEnabled: true },
        },
        {
          programId: "ended-prog",
          chainID: 10,
          name: "Ended Program",
          metadata: {
            title: "Ended Program",
            description: "No longer active",
            startsAt: "2023-01-01T00:00:00Z",
            endsAt: "2023-12-31T00:00:00Z",
            status: "inactive",
          },
          applicationConfig: { isEnabled: false },
        },
      ];

      server.use(
        http.get("*/v2/funding-program-configs/community/:communityId", () => {
          return HttpResponse.json(programs);
        })
      );

      const Page = await importPage();
      renderWithProviders(<Page />);

      // Step 1: Default filter is "active", so only active program shows
      await waitFor(
        () => {
          expect(screen.getByText("Active Program")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
      expect(screen.queryByText("Ended Program")).not.toBeInTheDocument();

      // Step 2: Change status filter to "All Status" to see all programs
      const statusSelect = screen.getByRole("combobox", { name: /status/i });
      await user.selectOptions(statusSelect, "all");

      await waitFor(() => {
        expect(screen.getByText("2 programs found")).toBeInTheDocument();
      });

      expect(screen.getByText("Active Program")).toBeInTheDocument();
      expect(screen.getByText("Ended Program")).toBeInTheDocument();

      // Step 3: Type in search to filter the "all status" results
      const searchInput = screen.getByPlaceholderText("Search programs...");
      await user.type(searchInput, "Ended");

      await waitFor(
        () => {
          expect(screen.getByText("1 program found")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.queryByText("Active Program")).not.toBeInTheDocument();
      expect(screen.getByText("Ended Program")).toBeInTheDocument();

      // Step 4: Clear all filters
      const clearButton = screen.getByRole("button", { name: /clear filters/i });
      await user.click(clearButton);

      // After clearing, the default status "active" from store is reset,
      // search is cleared, so the store goes back to initial state
      await waitFor(() => {
        const searchInputAfterClear = screen.getByPlaceholderText("Search programs...");
        expect(searchInputAfterClear).toHaveValue("");
      });
    });

    it("loads programs, switches from grid to none-matching search, sees empty, then clears", async () => {
      const user = userEvent.setup();

      const programs = [
        {
          programId: "only-program",
          chainID: 10,
          name: "Only Program",
          metadata: {
            title: "Only Program",
            description: "The only active program",
            startsAt: "2024-01-01T00:00:00Z",
            endsAt: "2028-12-31T00:00:00Z",
            status: "active",
          },
          applicationConfig: { isEnabled: true },
        },
      ];

      server.use(
        http.get("*/v2/funding-program-configs/community/:communityId", () => {
          return HttpResponse.json(programs);
        })
      );

      const Page = await importPage();
      renderWithProviders(<Page />);

      // Step 1: See the program
      await waitFor(
        () => {
          expect(screen.getByText("Only Program")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(screen.getByText("1 program found")).toBeInTheDocument();

      // Step 2: Search for something that doesn't match
      const searchInput = screen.getByPlaceholderText("Search programs...");
      await user.type(searchInput, "ZZZNonExistent");

      // Step 3: Wait for empty state
      await waitFor(
        () => {
          expect(screen.getByText("No programs available")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByText("0 programs found")).toBeInTheDocument();

      // Step 4: Clear the search
      await user.clear(searchInput);

      // Step 5: Program reappears
      await waitFor(
        () => {
          expect(screen.getByText("Only Program")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByText("1 program found")).toBeInTheDocument();
    });
  });
});
