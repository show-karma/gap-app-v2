import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { BrowseApplicationsClient } from "@/app/community/[communityId]/(with-header)/browse-applications/BrowseApplicationsClient";

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
      options?: { defaultValue?: unknown; clearOnDefault?: boolean }
    ) => {
      const [value, setValue] = useState<unknown>(
        () => urlStore.get(key) ?? options?.defaultValue ?? null
      );
      const set = (next: unknown) => {
        const resolved =
          typeof next === "function" ? (next as (p: unknown) => unknown)(value) : next;
        const isDefault = options?.clearOnDefault && resolved === options?.defaultValue;
        if (resolved == null || resolved === "" || isDefault) {
          urlStore.delete(key);
        } else {
          urlStore.set(key, String(resolved));
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

// The program selector is a custom listbox: a button (aria-haspopup="listbox")
// that opens a popup with role="option" entries — not a native <select>.
async function selectProgram(user: ReturnType<typeof userEvent.setup>, name: string) {
  const trigger = screen.getByRole("button", {
    name: /choose a program|test grant program|another program/i,
  });
  await user.click(trigger);
  const option = within(screen.getByRole("listbox")).getByRole("option", { name });
  await user.click(option);
}

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
