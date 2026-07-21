import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/__tests__/utils/render";
import { ProjectsExplorer } from "@/components/Pages/Projects/ProjectsExplorer";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import type { PaginatedProjectsResponse } from "@/types/v2/project";

/**
 * Interaction regressions for the /projects explorer (QA HIGHs):
 *
 * 1. Clearing the search input must clear ?q (and the results) immediately —
 *    it previously stayed stale because the clear went through the same debounce
 *    that a later render / the debounce-cleanup effect could cancel.
 * 2. The crawlable "Next" control must be a plain native anchor so its click
 *    performs a full SSR navigation instead of being client-intercepted once
 *    hydrated (the observed QA swallow left the URL and cards on page 1).
 */

// Stateful nuqs mock: a shared store with a STABLE per-key setter (mirroring the
// real nuqs `useCallback` setter) plus a subscription so setting a value
// re-renders every consumer — exactly what drives the query to re-run.
const nuqsStore = vi.hoisted(() => {
  const values = new Map<string, string>();
  const listeners = new Set<() => void>();
  return {
    values,
    listeners,
    notify() {
      for (const listener of listeners) {
        listener();
      }
    },
    reset() {
      values.clear();
    },
  };
});

vi.mock("nuqs", async () => {
  const React = await import("react");
  return {
    useQueryState: (key: string, options?: { defaultValue?: string }) => {
      const [, force] = React.useReducer((count: number) => count + 1, 0);
      React.useEffect(() => {
        nuqsStore.listeners.add(force);
        return () => {
          nuqsStore.listeners.delete(force);
        };
      }, []);
      const setterRef = React.useRef<(next: string | null) => Promise<URLSearchParams>>();
      if (!setterRef.current) {
        setterRef.current = (next: string | null) => {
          if (next === null || next === undefined) {
            nuqsStore.values.delete(key);
          } else {
            nuqsStore.values.set(key, next);
          }
          nuqsStore.notify();
          return Promise.resolve(new URLSearchParams());
        };
      }
      const value = nuqsStore.values.get(key) ?? options?.defaultValue ?? "";
      return [value, setterRef.current];
    },
  };
});

// Record every hook invocation and return results that reflect the search so the
// test can assert the query navigated (empty search -> "all", else "filtered").
const hookMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("@/hooks/useProjectsExplorerInfinite", () => ({
  useProjectsExplorerInfinite: hookMock.fn,
}));

// ProjectCard drags in heavy editor/image deps — replace with a sentinel.
vi.mock("@/components/Pages/Projects/ProjectCard", () => ({
  ProjectCard: ({ project }: { project: { uid: string; details?: { title?: string } } }) => (
    <div data-testid="project-card">{project.details?.title ?? project.uid}</div>
  ),
}));

vi.mock("@/utilities/query-client", () => ({
  queryClient: { removeQueries: vi.fn() },
}));

// Model the hydrated App-Router <Link>: once hydrated it intercepts the click
// (preventDefault) to run a soft client-side navigation, which in the observed
// QA swallowed pagination. Crawlable pagination must NOT depend on it — a native
// anchor navigates regardless of hydration state — so the fixed component
// renders a plain <a> and this mock is never reached.
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
    <a href={href} data-nextlink="true" onClick={(event) => event.preventDefault()} {...props}>
      {children}
    </a>
  ),
}));

function hookResult(search: string) {
  const filtered = search.length > 0;
  return {
    projects: [
      {
        uid: filtered ? "gardens-1" : "all-1",
        details: {
          title: filtered ? "Gardens Project" : "All Projects",
          slug: filtered ? "gardens-1" : "all-1",
        },
      },
    ],
    totalCount: filtered ? 501 : 999,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    isError: false,
    hasNextPage: true,
    fetchNextPage: vi.fn(),
  };
}

function lastSearch(): string | undefined {
  return hookMock.fn.mock.calls.at(-1)?.[0]?.search;
}

beforeEach(() => {
  nuqsStore.reset();
  vi.clearAllMocks();
  hookMock.fn.mockImplementation((options: { search?: string }) =>
    hookResult(options.search ?? "")
  );
});

describe("ProjectsExplorer search clearing", () => {
  it("clears ?q synchronously on empty input and re-runs the query with an empty search", () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<ProjectsExplorer />);
      const input = screen.getByRole("textbox", { name: /search projects/i });

      // Type a query — the debounced write lands only after the debounce delay.
      act(() => {
        fireEvent.change(input, { target: { value: "gardens" } });
      });
      act(() => {
        vi.advanceTimersByTime(PROJECTS_EXPLORER_CONSTANTS.DEBOUNCE_DELAY_MS + 1);
      });
      expect(nuqsStore.values.get("q")).toBe("gardens");
      expect(lastSearch()).toBe("gardens");
      expect(screen.getByText("501 projects found")).toBeInTheDocument();

      // Clearing must take effect immediately, WITHOUT advancing timers, so a
      // re-render or the debounce cleanup cannot cancel the pending clear.
      act(() => {
        fireEvent.change(input, { target: { value: "" } });
      });

      expect((input as HTMLInputElement).value).toBe("");
      expect(nuqsStore.values.get("q")).toBeUndefined();
      expect(lastSearch()).toBe("");
      expect(screen.getByText("999 projects found")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ProjectsExplorer crawlable Next navigation", () => {
  const initialState = {
    q: "",
    sortBy: "updatedAt" as const,
    sortOrder: "desc" as const,
    raisingFunds: false,
    page: 1,
  };

  const initialData: PaginatedProjectsResponse = {
    payload: [],
    pagination: {
      totalCount: 999,
      page: 1,
      limit: 50,
      totalPages: 20,
      nextPage: 2,
      prevPage: null,
      hasNextPage: true,
      hasPrevPage: false,
    },
  };

  it("renders Next as a native anchor whose click is not swallowed (full navigation)", () => {
    renderWithProviders(<ProjectsExplorer initialData={initialData} initialState={initialState} />);

    const next = screen.getByRole("link", { name: /next/i });
    expect(next).toHaveAttribute("href", "/projects?page=2#browse-projects");
    expect(next.tagName).toBe("A");
    // It must be a real native anchor, not the intercepting App-Router <Link>.
    expect(next).not.toHaveAttribute("data-nextlink");

    // Dispatch a real bubbling click and inspect the default AFTER React's
    // delegated container listener has run. React attaches its click handler on
    // the render container, so a one-shot listener on `document` (an ancestor)
    // bubbles last and observes whether next/link (via React) already cancelled
    // the default. A native anchor leaves it intact (browser does a full
    // navigation); the stopper then calls preventDefault purely to suppress the
    // jsdom navigation so the test stays quiet. Under the intercepting <Link>
    // mock, React prevents the default before the stopper — so it records true.
    let defaultPreventedBeforeStopper: boolean | null = null;
    document.addEventListener(
      "click",
      (event) => {
        defaultPreventedBeforeStopper = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true }
    );
    next.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(defaultPreventedBeforeStopper).toBe(false);
  });
});
