import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { BrowseApplicationsClient } from "@/app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/browse-applications/BrowseApplicationsClient";
import { useProgramsWithConfig } from "@/features/programs/hooks/use-programs-with-config";
import { api } from "@/utilities/api/client";
import { EXPLORER_NAV_OVERRIDES } from "@/utilities/community-flags";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { WhitelabelProvider } from "@/utilities/whitelabel-context";

// --- Mocks ---

// The component now uses nuqs `useQueryState` (via useBrowseApplicationFilters)
// as the single source of truth for the programId/status/search filters — it no
// longer calls router.replace. nuqs writes through history.replaceState in the
// real app; here we stub it with a reactive store so we can assert the resulting
// query string the same way the old router-based tests did.
const { urlStore } = vi.hoisted(() => ({ urlStore: new Map<string, string>() }));

/** Serialize the current nuqs-backed query state to a URL-style string. */
function currentUrl(): string {
  const params = new URLSearchParams();
  for (const [key, value] of urlStore) params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : "";
}

vi.mock("nuqs", async () => {
  const { useState } = await import("react");
  return {
    useQueryState: (
      key: string,
      options?: {
        defaultValue?: unknown;
        clearOnDefault?: boolean;
        parse?: (raw: string) => unknown;
        serialize?: (value: unknown) => string;
      }
    ) => {
      // `parse` and `serialize` are honoured the way real nuqs honours them:
      // the browse page relies on them to read a comma-joined `trackIds` handed
      // over by the explorer's multi-select filter.
      const [value, setValue] = useState<unknown>(() => {
        const raw = urlStore.get(key);
        if (raw == null) return options?.defaultValue ?? null;
        return options?.parse ? options.parse(raw) : raw;
      });
      const set = (next: unknown) => {
        const resolved =
          typeof next === "function" ? (next as (p: unknown) => unknown)(value) : next;
        const isDefault = options?.clearOnDefault && resolved === options?.defaultValue;
        if (resolved == null || resolved === "" || isDefault) {
          urlStore.delete(key);
        } else {
          const raw = options?.serialize ? options.serialize(resolved) : String(resolved);
          if (raw === "") urlStore.delete(key);
          else urlStore.set(key, raw);
        }
        setValue(resolved);
        return Promise.resolve(new URLSearchParams());
      };
      return [value, set] as const;
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: "/community/test-community/browse-applications",
  }),
  usePathname: () => "/community/test-community/browse-applications",
  useSearchParams: vi.fn(() => new URLSearchParams()),
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

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(() =>
      Promise.resolve({
        applications: [],
        pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
      })
    ),
  },
}));

// The component resolves the community UID, then its tracks; the track
// dropdown holds a slot while that is in flight and keeps it only if the
// community turns out to have tracks.
vi.mock("@/hooks/useTracks", () => ({
  useTracksForCommunity: vi.fn(() => ({
    data: [
      { id: "6a8cb595f1aaee1af87b80c2", name: "Kernel" },
      { id: "6a8cb5a1f1aaee1af87b80c4", name: "R&D" },
      { id: "6a8cb59af1aaee1af87b80c3", name: "Revenue Development" },
    ],
    isLoading: false,
  })),
}));

vi.mock("@/hooks/v2/useCommunityDetails", () => ({
  useCommunityDetails: vi.fn(() => ({ community: { uid: "0xcommunity" }, isLoading: false })),
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

// Robust mock: builds a stub SVG for every icon the component imports today,
// plus any reasonable icon it may add later, so future icon additions do not
// break this test file. We resolve the icon set from the actual lucide-react
// package exports and stub each one, rather than hand-listing names.
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("lucide-react");
  const toTestId = (name: string) =>
    `${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}-icon`;
  const stubbed: Record<string, unknown> = { __esModule: true };
  for (const name of Object.keys(actual)) {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={toTestId(name)} {...props} />
    );
    Icon.displayName = name;
    stubbed[name] = Icon;
  }
  return stubbed;
});

// --- Helpers ---

// Fresh QueryClient per render — no afterEach cleanup required
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

/**
 * Open one of the two dropdowns and pick an option.
 *
 * Both are the shared SearchWithValueDropdown: a Radix Popover trigger opening
 * a portalled cmdk list whose entries are plain buttons.
 *
 * The popover stays open after a pick, and clicking a trigger while one is open
 * closes it — so any open popover is dismissed first. That makes picking a
 * program and then a track work the same way it does for a real user.
 */
async function selectFromDropdown(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  name: string
) {
  await user.keyboard("{Escape}");
  // The <label> makes the label text the trigger's accessible name, whatever is
  // currently selected.
  await user.click(screen.getByLabelText(label));
  const option = await screen.findByRole("button", { name });
  await user.click(option);
}

const selectProgram = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  selectFromDropdown(user, "Choose Program", name);

/** The sibling dropdown, which lists the community's tracks. */
const selectTrack = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  selectFromDropdown(user, "Choose Track", name);

// Status filters are chip buttons inside a "Filter by status" fieldset.
async function clickStatusChip(user: ReturnType<typeof userEvent.setup>, label: string) {
  const fieldset = screen.getByRole("group", { name: "Filter by status" });
  const chip = within(fieldset).getByRole("button", { name: new RegExp(`^${label}`, "i") });
  await user.click(chip);
}

// --- Tests ---

describe("BrowseApplicationsClient - URL sync on filter change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    urlStore.clear();
  });

  it("updates the URL with programId when a program is selected", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    await selectProgram(user, "Test Grant Program");

    await waitFor(() => expect(currentUrl()).toContain("programId=program-abc"));
  });

  it("updates the URL with status when status filter changes", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    // First select a program so the status filter is rendered
    await selectProgram(user, "Test Grant Program");
    await clickStatusChip(user, "Approved");

    await waitFor(() => expect(currentUrl()).toContain("status=approved"));
  });

  it("updates the URL with search term when the user types in the search box", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    // First select a program so the search input is rendered
    await selectProgram(user, "Test Grant Program");

    const searchInput = screen.getByLabelText("Search applications");
    await user.type(searchInput, "my project");

    await waitFor(() => expect(currentUrl()).toContain("search="));
    expect(urlStore.get("search")).toBe("my project");
  });

  it("reflects combined filter state in the URL", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    await selectProgram(user, "Test Grant Program");
    await clickStatusChip(user, "Pending");

    await waitFor(() => {
      const url = currentUrl();
      expect(url).toContain("programId=program-abc");
      expect(url).toContain("status=pending");
    });
  });

  it("removes status param from URL when reset to 'all'", async () => {
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    await selectProgram(user, "Test Grant Program");

    await clickStatusChip(user, "Approved");
    await waitFor(() => expect(currentUrl()).toContain("status=approved"));

    await clickStatusChip(user, "All");
    await waitFor(() => expect(currentUrl()).not.toContain("status="));
  });

  it("keeps programId in the URL after a status filter is toggled off", async () => {
    // The pill selector has no "deselect" affordance, so once chosen the
    // programId persists. Toggling status back to "all" must not drop it.
    const user = userEvent.setup();
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    await selectProgram(user, "Test Grant Program");
    await clickStatusChip(user, "Approved");
    await clickStatusChip(user, "All");

    await waitFor(() => {
      const url = currentUrl();
      expect(url).toContain("programId=program-abc");
      expect(url).not.toContain("status=");
    });
  });
});

// The filecoin explorer renames this tab to "Browse Projects" on its own host;
// the decision was that the page heading follows the tab so the two agree. Both
// sides read the same EXPLORER_NAV_OVERRIDES entry and the same default out of
// COMMUNITY_NAV_LABELS (neither is mocked here — the real maps are what is
// under test), so a rename in one place cannot drift from the other.
describe("BrowseApplicationsClient - page heading tracks the explorer tab label", () => {
  const DEFAULT_HEADING_PROGRAMS = [
    {
      programId: "program-abc",
      chainID: 1,
      name: "Test Grant Program",
      applicationConfig: { formSchema: { fields: [] } },
    },
    {
      programId: "program-xyz",
      chainID: 1,
      name: "Another Program",
      applicationConfig: { formSchema: { fields: [] } },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    urlStore.clear();
    // clearAllMocks keeps implementations, so restore the empty defaults or a
    // per-test override leaks into every test after it.
    vi.mocked(api.get).mockResolvedValue({
      applications: [],
      pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
    });
    vi.mocked(useProgramsWithConfig).mockReturnValue({
      programs: DEFAULT_HEADING_PROGRAMS,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProgramsWithConfig>);
  });

  /** Renders as the tenant host would, where the override applies. */
  const renderWhitelabel = (communityId: string) =>
    render(
      <WhitelabelProvider
        value={{
          isWhitelabel: true,
          communitySlug: communityId,
          config: null,
          tenantConfig: null,
        }}
      >
        <BrowseApplicationsClient communityId={communityId} />
      </WhitelabelProvider>,
      { wrapper: createWrapper() }
    );

  it("uses the overridden tab label as the <h1> for filecoin on its own host", () => {
    renderWhitelabel("filecoin");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Browse Projects");
    expect(screen.queryByText("Browse applications")).not.toBeInTheDocument();
  });

  // Same reason the tab bar keeps its default labels on karmahq.org: the
  // rename belongs to the tenant's own navbar-carrying host.
  it("keeps the default heading for filecoin on karmahq.org", () => {
    render(<BrowseApplicationsClient communityId="filecoin" />, { wrapper: createWrapper() });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Browse applications");
    expect(screen.queryByText("Browse Projects")).not.toBeInTheDocument();
  });

  it("falls back to the default heading for a community without an override", () => {
    renderWhitelabel("test-community");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Browse applications");
    expect(screen.queryByText("Browse Projects")).not.toBeInTheDocument();
  });

  it("reads the label from EXPLORER_NAV_OVERRIDES rather than hardcoding it", () => {
    expect(EXPLORER_NAV_OVERRIDES.filecoin?.tabLabels?.["browse-applications"]).toBe(
      "Browse Projects"
    );
  });

  it("reads its default from the same map the tab bar defaults to", () => {
    expect(COMMUNITY_NAV_LABELS["browse-applications"]).toBe("Browse applications");
  });

  // "Browse Projects" over a count of "applications" is the drift this guards.
  it("counts the noun the heading names, not always 'applications'", async () => {
    const user = userEvent.setup();
    // A real count is needed to assert the noun beside it — the subtitle drops
    // the number entirely when it is zero or still unknown.
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/projects")) {
        return Promise.resolve({ payload: [{ uid: "0xkernel" }], pagination: { totalPages: 1 } });
      }
      return Promise.resolve({
        applications: [
          {
            referenceNumber: "APP-KERNEL",
            status: "approved",
            projectUID: "0xkernel",
            applicationData: { "Pod Name": "A Kernel project" },
          },
        ],
        pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
      });
    });
    renderWhitelabel("filecoin");

    // A track is picked from its own dropdown now, but the noun in the count
    // still has to follow the heading.
    await selectTrack(user, "Kernel");

    await waitFor(() => {
      expect(screen.getByText(/project(s)? · Kernel/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/application(s)? · Kernel/)).not.toBeInTheDocument();
  });

  // The empty state is the first thing a visitor arriving from "Projects
  // Explorer" reads, and "No applications yet" under a "Browse Projects"
  // heading is the same contradiction the count already guards against.
  // With no program selected the list is the whole community's, so the empty
  // state speaks for the community rather than for a program.
  it("names the same noun in the empty state as in the heading", async () => {
    renderWhitelabel("filecoin");

    await waitFor(() => {
      expect(screen.getByText("No projects yet")).toBeInTheDocument();
    });
    expect(
      screen.getByText("This community doesn't have any public projects yet.")
    ).toBeInTheDocument();
    expect(screen.queryByText("No applications yet")).not.toBeInTheDocument();
  });

  it("attributes the empty state to the program once one is selected", async () => {
    const user = userEvent.setup();
    renderWhitelabel("filecoin");

    await selectProgram(user, "Test Grant Program");

    await waitFor(() => {
      expect(
        screen.getByText("This program doesn't have any public projects yet.")
      ).toBeInTheDocument();
    });
  });

  it("keeps counting applications where the heading is the default", async () => {
    const user = userEvent.setup();
    // One program, so the aggregate landing count is unambiguous; its metrics
    // are what program mode counts once it is selected.
    vi.mocked(useProgramsWithConfig).mockReturnValue({
      programs: [
        {
          programId: "program-abc",
          chainID: 1,
          name: "Test Grant Program",
          applicationConfig: { formSchema: { fields: [] } },
          metrics: { totalApplications: 3 },
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProgramsWithConfig>);
    vi.mocked(api.get).mockResolvedValue({
      applications: [
        {
          referenceNumber: "APP-1",
          status: "approved",
          projectUID: "0xproject",
          applicationData: { "Pod Name": "A project" },
        },
      ],
      pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });
    render(<BrowseApplicationsClient communityId="test-community" />, {
      wrapper: createWrapper(),
    });

    // There is always a list now — never a "choose a program" prompt.
    expect(await screen.findByText("1 application")).toBeInTheDocument();
    expect(
      screen.queryByText("Choose a program to browse public applications.")
    ).not.toBeInTheDocument();

    await selectProgram(user, "Test Grant Program");

    await waitFor(() => {
      expect(screen.getByText(/application(s)? · Test Grant Program/)).toBeInTheDocument();
    });
  });
});

// Programs and tracks are two independent filters. "Choose Program" lists
// programs for every community — Kernel and R&D are tracks, and listing them as
// programs is the confusion this replaced. An application carries no track of
// its own, so a track narrows the list to the applications whose funded project
// sits in it.
