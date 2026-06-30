/**
 * U8 — report-create persona prefill integration. Mocks the data hooks and
 * drives the real CriteriaInputPanel + CriteriaForm to verify: prefill on
 * handle select, per-field badge dismiss-on-edit, the dirty discard dialog,
 * and silent fallback when the persona fetch errors.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useDonorPersona } from "@/hooks/useDonorPersona";
import { useCreateDonorReport } from "@/hooks/useDonorReports";
import { CriteriaInputPanel } from "@/src/features/donor-research/components/criteria-input/CriteriaInputPanel";
import { makeDonorHandle, makeDonorPersona } from "../../msw/handlers/donor-research.handlers";
import { renderWithProviders } from "../../utils/render";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/hooks/useDonorPersona", () => ({ useDonorPersona: vi.fn() }));

vi.mock("@/hooks/useDonorHandles", () => ({
  useDonorHandles: vi.fn(),
  useCreateDonorHandle: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useDonorReports", () => ({ useCreateDonorReport: vi.fn() }));

const mockUseDonorPersona = vi.mocked(useDonorPersona);
const mockUseDonorHandles = vi.mocked(useDonorHandles);
const mockUseCreateReport = vi.mocked(useCreateDonorReport);

const HANDLES = [
  makeDonorHandle({ id: "h1", opaqueLabel: "Acme" }),
  makeDonorHandle({ id: "h2", opaqueLabel: "Beta" }),
];

function personaResult(over: Partial<ReturnType<typeof useDonorPersona>> = {}) {
  return {
    data: makeDonorPersona(),
    isLoading: false,
    isError: false,
    ...over,
  } as unknown as ReturnType<typeof useDonorPersona>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseDonorHandles.mockReturnValue({
    data: { items: HANDLES, limit: 200, offset: 0 },
    isLoading: false,
  } as unknown as ReturnType<typeof useDonorHandles>);
  mockUseCreateReport.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useCreateDonorReport>);
  mockUseDonorPersona.mockReturnValue(personaResult());
});

const badges = () => screen.queryAllByText("Prefilled from persona");

describe("CriteriaInputPanel persona prefill", () => {
  it("prefills fields and shows per-field badges after selecting a handle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);

    expect(badges()).toHaveLength(0);

    await user.selectOptions(screen.getByLabelText("Donor handle"), "h1");

    // geoRadius "local" → resolver "metro". Amounts are NOT derived from the
    // gift size band (lossy), so they stay empty.
    await waitFor(() => expect(screen.getByLabelText(/Geography/)).toHaveValue("metro"));
    expect(screen.getByLabelText(/Amount min/)).toHaveValue(null);
    expect(screen.getByLabelText(/Amount max/)).toHaveValue(null);
    // criteriaText, geography, weights.
    expect(badges()).toHaveLength(3);
  });

  it("prefills amount min/max when the persona carries explicit figures", async () => {
    mockUseDonorPersona.mockReturnValue(
      personaResult({ data: makeDonorPersona({ amountMin: 5000, amountMax: 20000 }) })
    );
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);

    await user.selectOptions(screen.getByLabelText("Donor handle"), "h1");

    await waitFor(() => expect(screen.getByLabelText(/Amount min/)).toHaveValue(5000));
    expect(screen.getByLabelText(/Amount max/)).toHaveValue(20000);
    // criteriaText, geography, amountMin, amountMax, weights.
    expect(badges()).toHaveLength(5);
  });

  it("dismisses only the edited field's badge", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);
    await user.selectOptions(screen.getByLabelText("Donor handle"), "h1");
    await waitFor(() => expect(badges()).toHaveLength(3));

    const geography = screen.getByLabelText(/Geography/);
    await user.clear(geography);
    await user.type(geography, "California");

    // The geography badge drops; criteriaText + weights remain.
    await waitFor(() => expect(badges()).toHaveLength(2));
  });

  it("prompts a discard confirmation when changing handle while dirty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);
    await user.selectOptions(screen.getByLabelText("Donor handle"), "h1");
    await waitFor(() => expect(badges()).toHaveLength(3));

    // Make the form dirty, then switch handle.
    await user.type(screen.getByLabelText(/Geography/), "X");
    await user.selectOptions(screen.getByLabelText("Donor handle"), "h2");

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Discard your changes?")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /discard and switch/i }));
    await waitFor(() =>
      expect(screen.queryByText("Discard your changes?")).not.toBeInTheDocument()
    );
  });

  it("falls back to defaults with no badges when the persona fetch errors (5xx)", async () => {
    mockUseDonorPersona.mockReturnValue(
      personaResult({ data: undefined, isError: true } as Partial<
        ReturnType<typeof useDonorPersona>
      >)
    );
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);

    await user.selectOptions(screen.getByLabelText("Donor handle"), "h1");

    await waitFor(() => expect(screen.getByLabelText(/Geography/)).toHaveValue(""));
    expect(badges()).toHaveLength(0);
  });
});
