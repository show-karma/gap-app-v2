/**
 * Persona detail page (redesign P2, spec 2.3 "Persona detail"). Verifies the
 * title, that the persona editor and notes section render for
 * the fetched handle, the Reports card's three states, and that a handle
 * fetch failure throws (to the route's `error.tsx` boundary) instead of
 * silently rendering nothing.
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDonorHandle } from "@/hooks/useDonorHandles";
import { useDonorReports } from "@/hooks/useDonorReports";
import { PersonaDetailView } from "@/src/features/donor-research/components/personas/PersonaDetailView";
import type { ResearchReportListItem } from "@/types/donor-research";
import { makeDonorHandle } from "../../../msw/handlers/donor-research.handlers";
import { renderWithProviders } from "../../../utils/render";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/hooks/useDonorHandles", () => ({
  useDonorHandle: vi.fn(),
  // HandleNotesSection's own mutation — stubbed inert here (it has its own
  // test suite); this view just needs the module to export it.
  useUpdateDonorHandle: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useDonorReports", () => ({ useDonorReports: vi.fn() }));

// PersonaEditor is dynamic()-imported (ssr:false) — stub it so the test
// doesn't need to drive its own data hooks; it has its own test suite.
// `vi.mock` resolves against the module graph, not the test file's own
// directory, so the alias path here matches PersonaDetailView's relative
// `../donor-detail/PersonaEditor` import.
vi.mock("@/src/features/donor-research/components/donor-detail/PersonaEditor", () => ({
  PersonaEditor: ({
    handleId,
    onDirtyChange,
  }: {
    handleId: string;
    onDirtyChange?: (dirty: boolean) => void;
  }) => (
    <div data-testid="persona-editor">
      persona editor for {handleId}
      <button onClick={() => onDirtyChange?.(true)} type="button">
        Simulate unsaved edit
      </button>
    </div>
  ),
}));

const mockUseDonorHandle = vi.mocked(useDonorHandle);
const mockUseDonorReports = vi.mocked(useDonorReports);

const HANDLE = makeDonorHandle({ id: "h1", opaqueLabel: "Coastal Trust", notes: "Met at gala" });

function handleResult(overrides: Partial<ReturnType<typeof useDonorHandle>> = {}) {
  return {
    data: HANDLE,
    isLoading: false,
    isError: false,
    ...overrides,
  } as unknown as ReturnType<typeof useDonorHandle>;
}

function reportsResult(overrides: Partial<ReturnType<typeof useDonorReports>> = {}) {
  return {
    data: { items: [], limit: 25, offset: 0 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useDonorReports>;
}

const report = (overrides: Partial<ResearchReportListItem> = {}): ResearchReportListItem =>
  ({
    id: "r1",
    donorHandleId: "h1",
    donorHandleLabel: "Coastal Trust",
    criteriaId: "c1",
    criteriaSummary: "Climate resilience funders",
    mode: "deep",
    status: "complete",
    hasShareToken: false,
    shareTokenExpiresAt: null,
    createdAt: "2026-01-10T00:00:00.000Z",
    fastCompletedAt: null,
    completedAt: "2026-01-11T00:00:00.000Z",
    errorMessage: null,
    ...overrides,
  }) as ResearchReportListItem;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseDonorHandle.mockReturnValue(handleResult());
  mockUseDonorReports.mockReturnValue(reportsResult());
});

describe("PersonaDetailView", () => {
  it("renders the title, persona editor, and notes without a duplicate breadcrumb", async () => {
    const { container } = renderWithProviders(<PersonaDetailView handleId="h1" />);

    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Coastal Trust").length).toBeGreaterThan(0);
    // The persona editor is dynamic()-imported (ssr:false) — its stub resolves
    // asynchronously, after the wrapper's own loading fallback paints once.
    expect(await screen.findByTestId("persona-editor")).toHaveTextContent("persona editor for h1");
    expect(screen.getByLabelText("Donor description")).toHaveValue("Met at gala");
    expect(container.querySelector("[data-persona-detail-columns]")).toHaveClass(
      "lg:[grid-template-columns:minmax(0,3fr)_minmax(18rem,2fr)]"
    );
  });

  it("shows a loading skeleton while the handle is resolving", () => {
    mockUseDonorHandle.mockReturnValue(handleResult({ isLoading: true, data: undefined }));
    const { container } = renderWithProviders(<PersonaDetailView handleId="h1" />);
    expect(container.querySelectorAll(".animate-dashv3-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("persona-editor")).not.toBeInTheDocument();
  });

  it("throws the handle-fetch error instead of silently rendering nothing", () => {
    mockUseDonorHandle.mockReturnValue(
      handleResult({ isError: true, error: new Error("not found"), data: undefined } as never)
    );
    // No error boundary here — assert the component itself throws, which is
    // what lets the route's error.tsx take over in the real app.
    expect(() => renderWithProviders(<PersonaDetailView handleId="h1" />)).toThrow("not found");
  });

  it("Reports card: shows an empty state with a New report link when there are none", () => {
    renderWithProviders(<PersonaDetailView handleId="h1" />);

    expect(screen.getByText("No reports for this donor yet")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /new report/i })[0]).toHaveAttribute(
      "href",
      "/nonprofit-research/new?handle=h1"
    );
  });

  it("Reports card: lists filtered reports for this persona", () => {
    mockUseDonorReports.mockReturnValue(
      reportsResult({ data: { items: [report()], limit: 25, offset: 0 } })
    );

    renderWithProviders(<PersonaDetailView handleId="h1" />);

    expect(screen.getByText("Climate resilience funders")).toBeInTheDocument();
    expect(screen.getByText("1 report")).toBeInTheDocument();
  });

  it("Reports card: surfaces an error with retry", () => {
    const refetch = vi.fn();
    mockUseDonorReports.mockReturnValue(
      reportsResult({ isError: true, error: new Error("reports down"), refetch } as never)
    );

    renderWithProviders(<PersonaDetailView handleId="h1" />);

    expect(screen.getByText("reports down")).toBeInTheDocument();
  });

  it("Reports card: doesn't assert a total once the report count hits the query limit", () => {
    const items = Array.from({ length: 25 }, (_, i) => report({ id: `r${i}` }));
    mockUseDonorReports.mockReturnValue(reportsResult({ data: { items, limit: 25, offset: 0 } }));

    renderWithProviders(<PersonaDetailView handleId="h1" />);

    expect(screen.getByText("Showing latest 25 reports")).toBeInTheDocument();
    expect(screen.queryByText("25 reports")).not.toBeInTheDocument();
  });

  it("§1.2: guards a shell breadcrumb link with a discard-confirm while the persona editor is dirty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PersonaDetailView handleId="h1" />);

    const shellBreadcrumbLink = document.createElement("a");
    shellBreadcrumbLink.href = "/nonprofit-research/personas";
    shellBreadcrumbLink.textContent = "Personas";
    document.body.appendChild(shellBreadcrumbLink);

    try {
      await user.click(await screen.findByRole("button", { name: /simulate unsaved edit/i }));
      await user.click(shellBreadcrumbLink);

      expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: /keep editing/i }));
      expect(screen.queryByText("Discard unsaved changes?")).not.toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(shellBreadcrumbLink);
    }
  });

  it("§1.2: guards navigation while the private notes field is dirty (not just the persona editor)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PersonaDetailView handleId="h1" />);

    const shellLink = document.createElement("a");
    shellLink.href = "/nonprofit-research";
    shellLink.textContent = "Reports";
    document.body.appendChild(shellLink);

    try {
      // Edit ONLY the notes field (the persona editor stays clean) — an unsaved
      // note must still block navigation.
      const notes = await screen.findByLabelText("Donor description");
      await user.type(notes, " and follow up in Q3");
      await user.click(shellLink);

      expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      document.body.removeChild(shellLink);
    }
  });

  it("§1.2: 'Discard' proceeds with the held navigation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PersonaDetailView handleId="h1" />);

    await user.click(await screen.findByRole("button", { name: /simulate unsaved edit/i }));
    await user.click(screen.getByRole("link", { name: /new report for this donor/i }));
    await user.click(await screen.findByRole("button", { name: /^discard$/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/nonprofit-research/new?handle=h1"));
  });

  it("§1.2: guards the 'New report for this persona' link while the persona editor is dirty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PersonaDetailView handleId="h1" />);

    await user.click(await screen.findByRole("button", { name: /simulate unsaved edit/i }));
    await user.click(screen.getByRole("link", { name: /new report for this donor/i }));

    expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
  });

  it("§1.2: guards a Reports-card report-row link while the persona editor is dirty", async () => {
    const user = userEvent.setup();
    mockUseDonorReports.mockReturnValue(
      reportsResult({ data: { items: [report()], limit: 25, offset: 0 } })
    );
    renderWithProviders(<PersonaDetailView handleId="h1" />);

    await user.click(await screen.findByRole("button", { name: /simulate unsaved edit/i }));
    await user.click(screen.getByText("Climate resilience funders"));

    expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: /^discard$/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/nonprofit-research/r1"));
  });

  it("§1.2: guards the empty-state 'New report' CTA while the persona editor is dirty", async () => {
    const user = userEvent.setup();
    // Default `reportsResult()` already has zero items — the empty-state CTA
    // is on screen exactly when a fresh persona's profile is first being
    // authored, which is the scenario this guards.
    renderWithProviders(<PersonaDetailView handleId="h1" />);

    await user.click(await screen.findByRole("button", { name: /simulate unsaved edit/i }));
    await user.click(screen.getByRole("button", { name: /^new report$/i }));

    expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: /^discard$/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/nonprofit-research/new?handle=h1"));
  });

  it("§1.2: guards a link the shell rail / navbar renders — outside this component's own tree — while the persona editor is dirty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PersonaDetailView handleId="h1" />);

    // `DonorResearchShell`'s sticky rail (and the global navbar) render
    // outside `PersonaDetailView`'s own tree — there's no `onClick` prop this
    // component could attach a guard to, so simulate one directly on
    // `document.body` and rely on the component's document-level capture
    // listener to intercept it.
    const railLink = document.createElement("a");
    railLink.href = "/nonprofit-research/diligence-template";
    railLink.textContent = "Diligence questions";
    document.body.appendChild(railLink);

    try {
      await user.click(await screen.findByRole("button", { name: /simulate unsaved edit/i }));
      await user.click(railLink);

      expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();

      await user.click(await screen.findByRole("button", { name: /^discard$/i }));
      await waitFor(() =>
        expect(pushMock).toHaveBeenCalledWith("/nonprofit-research/diligence-template")
      );
    } finally {
      document.body.removeChild(railLink);
    }
  });

  it("doesn't hijack a modifier-click on a guarded link (e.g. cmd/ctrl-click to open a new tab)", async () => {
    const user = userEvent.setup();
    mockUseDonorReports.mockReturnValue(
      reportsResult({ data: { items: [report()], limit: 25, offset: 0 } })
    );
    renderWithProviders(<PersonaDetailView handleId="h1" />);

    await user.click(await screen.findByRole("button", { name: /simulate unsaved edit/i }));
    // userEvent's `click` convenience API doesn't expose modifier-key event
    // init, so this one assertion drops to `fireEvent` to set `ctrlKey`.
    fireEvent.click(screen.getByText("Climate resilience funders"), { ctrlKey: true });

    expect(screen.queryByText("Discard unsaved changes?")).not.toBeInTheDocument();
  });

  it("§1.2: registers a beforeunload guard only while the persona editor is dirty", async () => {
    const user = userEvent.setup();
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    renderWithProviders(<PersonaDetailView handleId="h1" />);
    expect(addSpy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));

    await user.click(await screen.findByRole("button", { name: /simulate unsaved edit/i }));
    expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    // Discarding clears the dirty flag, which tears the listener back down.
    await user.click(screen.getByRole("link", { name: /new report for this donor/i }));
    await user.click(await screen.findByRole("button", { name: /^discard$/i }));
    await waitFor(() =>
      expect(removeSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function))
    );

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
