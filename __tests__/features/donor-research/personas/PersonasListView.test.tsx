/**
 * Personas list (redesign P2, spec 2.3 "Personas list"). Verifies the three
 * states, the per-row persona chip driven by `useDonorPersona`, the
 * per-row "New report" link (`/new?handle=<id>` preselect), and the
 * header "New donor" quick-create flow.
 */

import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCreateDonorHandle, useDonorHandles } from "@/hooks/useDonorHandles";
import { useDonorPersona } from "@/hooks/useDonorPersona";
import { PersonasListView } from "@/src/features/donor-research/components/personas/PersonasListView";
import { makeDonorHandle, makeDonorPersona } from "../../../msw/handlers/donor-research.handlers";
import { renderWithProviders } from "../../../utils/render";

// PersonaRow lazy-fetches its profile chip via IntersectionObserver (bounds
// the list's request burst — see PersonasListView.tsx). The global jsdom stub
// (__tests__/setup.ts) never calls back, so rows would never report
// "visible" here; report every observed row as immediately intersecting so
// the chip assertions below exercise the real render path.
class ImmediateIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  window.IntersectionObserver =
    ImmediateIntersectionObserver as unknown as typeof IntersectionObserver;
});

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({}),
}));

vi.mock("@/hooks/useDonorHandles", () => ({
  useDonorHandles: vi.fn(),
  useCreateDonorHandle: vi.fn(),
}));

vi.mock("@/hooks/useDonorPersona", () => ({ useDonorPersona: vi.fn() }));

const mockUseDonorHandles = vi.mocked(useDonorHandles);
const mockUseCreateDonorHandle = vi.mocked(useCreateDonorHandle);
const mockUseDonorPersona = vi.mocked(useDonorPersona);

function handlesResult(overrides: Partial<ReturnType<typeof useDonorHandles>> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useDonorHandles>;
}

function personaResult(data: ReturnType<typeof makeDonorPersona> | null = null) {
  return {
    data,
    isSuccess: true,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useDonorPersona>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCreateDonorHandle.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateDonorHandle>);
  mockUseDonorPersona.mockReturnValue(personaResult(null));
});

describe("PersonasListView", () => {
  it("renders a skeleton while loading", () => {
    mockUseDonorHandles.mockReturnValue(handlesResult({ isLoading: true }));
    const { container } = renderWithProviders(<PersonasListView />);
    expect(container.querySelectorAll(".animate-dashv3-pulse").length).toBeGreaterThan(0);
  });

  it("surfaces an error with retry", () => {
    const refetch = vi.fn();
    mockUseDonorHandles.mockReturnValue(
      handlesResult({ isError: true, error: new Error("boom"), refetch } as never)
    );
    renderWithProviders(<PersonasListView />);

    expect(screen.getByText("boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows the empty-state CTA when there are no personas", async () => {
    mockUseDonorHandles.mockReturnValue(
      handlesResult({ data: { items: [], limit: 200, offset: 0 } })
    );
    renderWithProviders(<PersonasListView />);

    expect(screen.getByText("No donors yet")).toBeInTheDocument();
    // Two "New donor" triggers exist (header + empty-state CTA).
    expect(screen.getAllByRole("button", { name: /new donor/i }).length).toBeGreaterThanOrEqual(2);
  });

  it("renders persona rows with the profile chip, notes preview, and a per-row New report link", () => {
    const handle = makeDonorHandle({ id: "h1", opaqueLabel: "Coastal Trust", notes: "Warm intro" });
    mockUseDonorHandles.mockReturnValue(
      handlesResult({ data: { items: [handle], limit: 200, offset: 0 } })
    );
    mockUseDonorPersona.mockReturnValue(personaResult(makeDonorPersona()));

    renderWithProviders(<PersonasListView />);

    expect(screen.getByText("Coastal Trust")).toBeInTheDocument();
    expect(screen.getByText("Profile ready")).toBeInTheDocument();
    expect(screen.getByText("Warm intro")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /coastal trust/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/nonprofit-research/personas/h1")
    );
    expect(screen.getByRole("link", { name: /new report/i })).toHaveAttribute(
      "href",
      "/nonprofit-research/new?handle=h1"
    );
  });

  it("shows 'No profile yet' when the persona has none", () => {
    const handle = makeDonorHandle({ id: "h2", opaqueLabel: "North Star Fund" });
    mockUseDonorHandles.mockReturnValue(
      handlesResult({ data: { items: [handle], limit: 200, offset: 0 } })
    );
    mockUseDonorPersona.mockReturnValue(personaResult(null));

    renderWithProviders(<PersonasListView />);

    expect(screen.getByText("No profile yet")).toBeInTheDocument();
  });

  it("quick-creates a persona without navigating away and offers profile setup", async () => {
    const user = userEvent.setup();
    mockUseDonorHandles.mockReturnValue(
      handlesResult({ data: { items: [], limit: 200, offset: 0 } })
    );
    const created = makeDonorHandle({ id: "h-new", opaqueLabel: "New Fund" });
    const createPersona = vi.fn().mockResolvedValue(created);
    mockUseCreateDonorHandle.mockReturnValue({
      mutateAsync: createPersona,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateDonorHandle>);

    renderWithProviders(<PersonasListView />);

    await user.click(screen.getAllByRole("button", { name: /new donor/i })[0]);
    await user.type(screen.getByLabelText("New donor name"), "New Fund");
    expect(screen.getByRole("button", { name: /continue to profile/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /save without profile/i }));

    expect(createPersona).toHaveBeenCalledWith({ opaqueLabel: "New Fund" });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
