/**
 * @file Emit-site coverage for `search_performed` in the global navbar search.
 *
 * The catalog (`utilities/analytics/events.ts`) declares
 * `search_performed: { query_length, results_count, surface }`. Two things
 * matter here and neither is provable by rendering the component alone:
 *   - the raw query text must never reach the event (only its length), and
 *   - a failed search still reports, with `results_count: null` rather than 0,
 *     so "search broke" is distinguishable from "search found nothing".
 */

import { fireEvent, render, screen } from "@testing-library/react";

const mockUnifiedSearch = vi.fn();
const mockTrack = vi.fn();

vi.mock("@/services/unified-search.service", () => ({
  unifiedSearch: (...args: unknown[]) => mockUnifiedSearch(...args),
}));

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

// The component debounces by 500ms; run the callback synchronously so the
// assertions do not depend on timer plumbing. Tests below fire a single
// change event (not per-keystroke typing) so one edit means one search.
vi.mock("lodash.debounce", () => ({
  default: (fn: (...args: unknown[]) => unknown) => {
    const wrapped = (...args: unknown[]) => fn(...args);
    wrapped.cancel = () => {};
    wrapped.flush = () => {};
    return wrapped;
  },
}));

vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: () => <div data-testid="profile-picture" />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    COMMUNITY: { ALL_GRANTS: (slug: string) => `/community/${slug}` },
    PROJECT: { GRANTS: (slug: string) => `/project/${slug}` },
  },
}));

import { NavbarSearch } from "@/src/components/navbar/navbar-search";

const emptyResult = { communities: [], projects: [] };

const trackedSearches = () => mockTrack.mock.calls.filter(([name]) => name === "search_performed");

beforeEach(() => {
  vi.clearAllMocks();
  mockUnifiedSearch.mockResolvedValue(emptyResult);
});

describe("NavbarSearch analytics", () => {
  it("emits search_performed with the result count on a successful search", async () => {
    mockUnifiedSearch.mockResolvedValue({
      communities: [{ uid: "c1", name: "Alpha", slug: "alpha" }],
      projects: [
        { uid: "p1", title: "One", slug: "one" },
        { uid: "p2", title: "Two", slug: "two" },
      ],
    });

    render(<NavbarSearch />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "solar" } });

    await vi.waitFor(() => expect(trackedSearches()).toHaveLength(1));

    expect(trackedSearches()[0]).toEqual([
      "search_performed",
      { query_length: 5, results_count: 3, surface: "navbar" },
    ]);
  });

  it("reports results_count: null (not 0) when the search request fails", async () => {
    mockUnifiedSearch.mockRejectedValue(new Error("upstream down"));

    render(<NavbarSearch />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "solar" } });

    await vi.waitFor(() => expect(trackedSearches()).toHaveLength(1));

    const [, props] = trackedSearches()[0];
    expect(props).toEqual({ query_length: 5, results_count: null, surface: "navbar" });
    // A failed search reporting 0 would be indistinguishable from a genuine
    // zero-result search, which is the metric this event exists to measure.
    expect(props.results_count).not.toBe(0);
  });

  it("never puts the query text on the event", async () => {
    render(<NavbarSearch />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "vitalik" } });

    await vi.waitFor(() => expect(trackedSearches()).toHaveLength(1));

    const serialised = JSON.stringify(trackedSearches()[0]);
    expect(serialised).not.toContain("vitalik");
    expect(trackedSearches()[0][1]).toMatchObject({ query_length: 7 });
  });

  it("does not emit for queries below the 3-character threshold", async () => {
    render(<NavbarSearch />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "so" } });

    expect(mockUnifiedSearch).not.toHaveBeenCalled();
    expect(trackedSearches()).toHaveLength(0);
  });
});
