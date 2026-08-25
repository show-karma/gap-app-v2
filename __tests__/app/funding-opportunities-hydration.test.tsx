/**
 * Hydration continuity for the funding-opportunities directory (DEV-611).
 *
 * The route server-renders the program directory through a HydrationBoundary;
 * these tests render the real server page, mount its output in jsdom the way
 * the browser does, and then interact — pinning that the status tabs and the
 * search box still drive the list and the URL after hydration, with the
 * server-prefetched data (no second fetch) underneath.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProgramsStore } from "@/src/features/programs/lib/store";
import type { FundingProgram } from "@/types/whitelabel-entities";

const mockGet = vi.fn();
const replaceMock = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "celo" }),
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, prefetch: vi.fn() }),
  usePathname: () => "/community/celo/funding-opportunities",
  useSearchParams: () => new URLSearchParams(),
}));

function createPrograms(): FundingProgram[] {
  return [
    {
      programId: "prog-open",
      chainID: 42220,
      name: "Open Grants",
      metadata: {
        title: "Open Grants",
        description: "Live round accepting applications.",
        startsAt: "2020-01-01T12:00:00.000Z",
        endsAt: "2099-12-31T12:00:00.000Z",
      },
      applicationConfig: { isEnabled: true },
    },
    {
      programId: "prog-closed",
      chainID: 42220,
      name: "Closed Round",
      metadata: {
        title: "Closed Round",
        description: "A round whose deadline has passed.",
        startsAt: "2020-01-01T12:00:00.000Z",
        endsAt: "2021-01-01T12:00:00.000Z",
      },
      applicationConfig: { isEnabled: false },
    },
  ] as FundingProgram[];
}

async function renderHydratedPage() {
  const { default: Page } = await import(
    "@/app/community/[communityId]/(with-header)/funding-opportunities/page"
  );
  const ui = await Page({ params: Promise.resolve({ communityId: "celo" }) });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // The filter store is module-level; put it back to its defaults so each
  // test starts from the state a fresh page load sees.
  useProgramsStore.getState().reset();
  mockGet.mockResolvedValue(createPrograms());
});

describe("funding-opportunities directory — post-hydration interaction", () => {
  it("clicking the Closed tab filters the list and writes ?status=ended", async () => {
    const user = userEvent.setup();
    await renderHydratedPage();

    // Hydrated server data: the open program renders without a client fetch.
    expect(await screen.findByText("Open Grants")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Closed" }));

    expect(screen.getByRole("tab", { name: "Closed" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => {
      expect(screen.getByText("Closed Round")).toBeInTheDocument();
    });
    expect(screen.queryByText("Open Grants")).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith("/community/celo/funding-opportunities?status=ended", {
      scroll: false,
    });
  });

  it("typing in the search box filters the list and writes ?q=", async () => {
    const user = userEvent.setup();
    await renderHydratedPage();

    await screen.findByText("Open Grants");
    await user.type(screen.getByLabelText("Search programs"), "closed");

    await waitFor(() => {
      expect(screen.queryByText("Open Grants")).not.toBeInTheDocument();
    });
    expect(replaceMock).toHaveBeenLastCalledWith(expect.stringContaining("q=closed"), {
      scroll: false,
    });
  });

  it("interacts against the hydrated cache without a second fetch", async () => {
    const user = userEvent.setup();
    await renderHydratedPage();

    await screen.findByText("Open Grants");
    await user.click(screen.getByRole("tab", { name: "Closed" }));
    await screen.findByText("Closed Round");

    // Exactly the one server-side prefetch — the client mounted against the
    // hydrated entry and the tab click filtered in memory.
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
