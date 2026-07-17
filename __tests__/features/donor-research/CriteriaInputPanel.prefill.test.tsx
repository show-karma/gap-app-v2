/**
 * U8 — report-create persona prefill integration. Mocks the data hooks and
 * drives the real CriteriaInputPanel + CriteriaForm to verify: prefill on
 * handle select, per-field badge dismiss-on-edit, the dirty discard dialog,
 * and silent fallback when the persona fetch errors.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useDonorPersona } from "@/hooks/useDonorPersona";
import { useCreateDonorReport } from "@/hooks/useDonorReports";
import { CriteriaInputPanel } from "@/src/features/donor-research/components/criteria-input/CriteriaInputPanel";
import { makeDonorHandle, makeDonorPersona } from "../../msw/handlers/donor-research.handlers";
import { renderWithProviders } from "../../utils/render";

// jsdom does not implement pointer capture, which Radix Select uses while
// opening with a pointer. Keep the test interaction aligned with the real
// shadcn control instead of falling back to its hidden native form element.
beforeAll(() => {
  Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: { configurable: true, value: () => false },
    releasePointerCapture: { configurable: true, value: () => {} },
    scrollIntoView: { configurable: true, value: () => {} },
    setPointerCapture: { configurable: true, value: () => {} },
  });
});

// The picker's "Add profile" / "Change profile" link (routed through the
// app's `Link` wrapper) reads `useParams` for whitelabel URL-building —
// stub it alongside `useRouter` so that render path doesn't throw here.
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

vi.mock("@/src/features/donor-research/components/criteria-input/NewDonorHandleModal", () => ({
  NewDonorHandleModal: ({
    open,
    editHandle,
  }: {
    open: boolean;
    editHandle?: { opaqueLabel: string } | null;
  }) =>
    open ? (
      <div role="dialog">Profile modal for {editHandle?.opaqueLabel ?? "new persona"}</div>
    ) : null,
}));

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

async function selectPersona(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("combobox", { name: "Persona" }));
  await user.click(await screen.findByRole("option", { name }));
}

describe("CriteriaInputPanel persona prefill", () => {
  it("prefills fields and shows per-field badges after selecting a handle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);

    expect(badges()).toHaveLength(0);

    await selectPersona(user, "Acme");

    // Geography is the persona's extracted place string (not the geoRadius
    // enum). Amounts are NOT derived from the gift size band, so they stay empty.
    await waitFor(() => expect(screen.getByLabelText(/Geography/)).toHaveValue("Greater Boston"));
    expect(screen.getByLabelText(/Amount min/)).toHaveValue(null);
    expect(screen.getByLabelText(/Amount max/)).toHaveValue(null);
    // criteriaText, geography, weights.
    expect(badges()).toHaveLength(3);
  });

  it("prefills the Cause field when the persona carries a focus area", async () => {
    mockUseDonorPersona.mockReturnValue(
      personaResult({ data: makeDonorPersona({ cause: "climate" }) })
    );
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);

    await selectPersona(user, "Acme");

    await waitFor(() => expect(screen.getByLabelText(/Cause/)).toHaveValue("climate"));
  });

  it("prefills amount min/max when the persona carries explicit figures", async () => {
    mockUseDonorPersona.mockReturnValue(
      personaResult({ data: makeDonorPersona({ amountMin: 5000, amountMax: 20000 }) })
    );
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);

    await selectPersona(user, "Acme");

    await waitFor(() => expect(screen.getByLabelText(/Amount min/)).toHaveValue(5000));
    expect(screen.getByLabelText(/Amount max/)).toHaveValue(20000);
    // criteriaText, geography, amountMin, amountMax, weights.
    expect(badges()).toHaveLength(5);
  });

  it("dismisses only the edited field's badge", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);
    await selectPersona(user, "Acme");
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
    await selectPersona(user, "Acme");
    await waitFor(() => expect(badges()).toHaveLength(3));

    // Make the form dirty, then switch handle.
    await user.type(screen.getByLabelText(/Geography/), "X");
    await selectPersona(user, "Beta");

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Discard your changes?")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /discard and switch/i }));
    await waitFor(() =>
      expect(screen.queryByText("Discard your changes?")).not.toBeInTheDocument()
    );
  });

  it("opens persona editing in place without navigating away from the report form", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);

    await selectPersona(user, "Acme");
    await user.click(screen.getByRole("button", { name: /change profile for acme/i }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("Profile modal for Acme");
  });

  it("falls back to defaults with no badges when the persona fetch errors (5xx)", async () => {
    mockUseDonorPersona.mockReturnValue(
      personaResult({ data: undefined, isError: true } as Partial<
        ReturnType<typeof useDonorPersona>
      >)
    );
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);

    await selectPersona(user, "Acme");

    await waitFor(() => expect(screen.getByLabelText(/Geography/)).toHaveValue(""));
    expect(badges()).toHaveLength(0);
  });

  it("toasts when the create request is rejected (e.g. a rate-limit 429)", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error("Daily fast-report limit reached"));
    mockUseCreateReport.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateDonorReport>);
    const user = userEvent.setup();
    renderWithProviders(<CriteriaInputPanel />);

    // Select a persona so the form is valid (criteria prefilled), then submit.
    await selectPersona(user, "Acme");
    await user.click(screen.getByRole("button", { name: /create report/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith("Daily fast-report limit reached");
  });
});
