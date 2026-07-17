/**
 * QA repro attempt for dogfood ISSUE-002: the /new "Advanced" disclosure
 * appeared stuck closed against the live dev server. Drives the real
 * CriteriaInputPanel composition (same as the /new page) and toggles the
 * disclosure, including after a persona prefill re-render.
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useDonorPersona } from "@/hooks/useDonorPersona";
import { useCreateDonorReport } from "@/hooks/useDonorReports";
import { CriteriaInputPanel } from "@/src/features/donor-research/components/criteria-input/CriteriaInputPanel";
import { makeDonorHandle } from "../../msw/handlers/donor-research.handlers";
import { renderWithProviders } from "../../utils/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
}));

vi.mock("@/hooks/useDonorPersona", () => ({ useDonorPersona: vi.fn() }));

vi.mock("@/hooks/useDonorHandles", () => ({
  useDonorHandles: vi.fn(),
  useCreateDonorHandle: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useDonorReports", () => ({ useCreateDonorReport: vi.fn() }));

const mockUseDonorPersona = vi.mocked(useDonorPersona);
const mockUseDonorHandles = vi.mocked(useDonorHandles);
const mockUseCreateReport = vi.mocked(useCreateDonorReport);

const HANDLES = [makeDonorHandle({ id: "h1", opaqueLabel: "Hartwell" })];

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: { configurable: true, value: () => false },
    releasePointerCapture: { configurable: true, value: () => undefined },
    scrollIntoView: { configurable: true, value: () => undefined },
    setPointerCapture: { configurable: true, value: () => undefined },
  });
  mockUseDonorHandles.mockReturnValue({
    data: { items: HANDLES, limit: 200, offset: 0 },
    isLoading: false,
    isSuccess: true,
  } as unknown as ReturnType<typeof useDonorHandles>);
  mockUseCreateReport.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useCreateDonorReport>);
  mockUseDonorPersona.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useDonorPersona>);
});

function advancedTrigger() {
  return screen.getByRole("button", { name: /advanced: ranking weights/i });
}

async function selectPersona(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: /persona/i }));
  await user.click(await screen.findByRole("option", { name: "Hartwell" }));
}

describe("ISSUE-002 repro: Advanced disclosure on the /new composition", () => {
  it("opens and closes via the trigger with no persona selected", () => {
    renderWithProviders(<CriteriaInputPanel />);
    const trigger = advancedTrigger();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(advancedTrigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Scoring weights")).toBeInTheDocument();
    fireEvent.click(advancedTrigger());
    expect(advancedTrigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("still toggles after selecting a persona and typing criteria (live repro sequence)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);
    await selectPersona(user);
    await user.type(screen.getByRole("textbox", { name: /criteria/i }), "Education nonprofits");
    fireEvent.click(advancedTrigger());
    await waitFor(() => expect(advancedTrigger()).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getByText("Scoring weights")).toBeInTheDocument();
  });

  it("stays open across a persona-prefill re-render", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<CriteriaInputPanel />);
    fireEvent.click(advancedTrigger());
    expect(advancedTrigger()).toHaveAttribute("aria-expanded", "true");
    await selectPersona(user);
    rerender(<CriteriaInputPanel />);
    await waitFor(() => expect(advancedTrigger()).toHaveAttribute("aria-expanded", "true"));
  });
});
