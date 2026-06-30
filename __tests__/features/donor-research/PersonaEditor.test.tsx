/**
 * U7 — PersonaEditor state-machine tests.
 *
 * The persona hooks, toast, and the Radix-based chips are mocked so the test
 * exercises the editor's local state machine (hydration, dirty gating,
 * refine→edit→save, aria-live) without Radix Select interaction in jsdom.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import {
  useDonorPersona,
  useRefineDonorPersona,
  useUpdateDonorPersona,
} from "@/hooks/useDonorPersona";
import { PersonaEditor } from "@/src/features/donor-research/components/donor-detail/PersonaEditor";
import {
  emptyPersonaStructured,
  makeDonorPersona,
  makeRefinementResult,
} from "../../msw/handlers/donor-research.handlers";
import { renderWithProviders } from "../../utils/render";

vi.mock("@/hooks/useDonorPersona", () => ({
  donorPersonaQueryKey: (id: string) => ["donor-persona", id],
  useDonorPersona: vi.fn(),
  useUpdateDonorPersona: vi.fn(),
  useRefineDonorPersona: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Replace the Radix-based chips with a lightweight double that surfaces the
// structured state and a button to drive a chip edit.
vi.mock("@/src/features/donor-research/components/donor-detail/PersonaStructuredChips", () => ({
  PersonaStructuredChips: ({
    structured,
    onChange,
  }: {
    structured: unknown;
    onChange: (key: string, value: string | null) => void;
  }) => (
    <div>
      <div data-testid="chips-json">{JSON.stringify(structured)}</div>
      <button type="button" onClick={() => onChange("orgMaturity", "mixed")}>
        edit-chip
      </button>
    </div>
  ),
}));

const mockUseDonorPersona = vi.mocked(useDonorPersona);
const mockUseUpdate = vi.mocked(useUpdateDonorPersona);
const mockUseRefine = vi.mocked(useRefineDonorPersona);

interface SetupOptions {
  persona?: ReturnType<typeof makeDonorPersona> | null;
  isLoading?: boolean;
  isError?: boolean;
}

function setup(options: SetupOptions = {}) {
  const { persona = null, isLoading = false, isError = false } = options;
  mockUseDonorPersona.mockReturnValue({
    data: persona,
    isLoading,
    isError,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useDonorPersona>);

  const updateMutate = vi.fn();
  mockUseUpdate.mockReturnValue({ mutate: updateMutate, isPending: false } as unknown as ReturnType<
    typeof useUpdateDonorPersona
  >);

  const refineMutate = vi.fn();
  mockUseRefine.mockReturnValue({ mutate: refineMutate, isPending: false } as unknown as ReturnType<
    typeof useRefineDonorPersona
  >);

  return { updateMutate, refineMutate };
}

beforeEach(() => vi.clearAllMocks());

const saveButton = () => screen.getByRole("button", { name: /save persona/i });

describe("PersonaEditor cold-mount states", () => {
  it("1) no persona: empty textarea, narrative placeholder, Save disabled", () => {
    setup({ persona: null });
    renderWithProviders(<PersonaEditor handleId="h1" />);

    expect(screen.getByLabelText("Persona source")).toHaveValue("");
    expect(screen.getByText(/No narrative yet/i)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("2) exists but never refined: source populated, narrative placeholder, Save disabled", () => {
    setup({
      persona: makeDonorPersona({
        narrative: null,
        sourceText: "kickoff notes about this donor",
        structured: emptyPersonaStructured(),
      }),
    });
    renderWithProviders(<PersonaEditor handleId="h1" />);

    expect(screen.getByLabelText("Persona source")).toHaveValue("kickoff notes about this donor");
    expect(screen.getByText(/No narrative yet/i)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("3) refined and untouched: narrative shown, Save disabled (not dirty)", () => {
    setup({ persona: makeDonorPersona() });
    renderWithProviders(<PersonaEditor handleId="h1" />);

    expect(
      screen.getByText(/An established local funder with a multi-decade focus/i)
    ).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });
});

describe("PersonaEditor isDirty gating", () => {
  it("enables Save after a chip edit and flips the chip to manual", async () => {
    const user = userEvent.setup();
    setup({
      persona: makeDonorPersona({ narrative: null, structured: emptyPersonaStructured() }),
    });
    renderWithProviders(<PersonaEditor handleId="h1" />);

    expect(saveButton()).toBeDisabled();
    await user.click(screen.getByText("edit-chip"));

    expect(saveButton()).toBeEnabled();
    const chips = JSON.parse(screen.getByTestId("chips-json").textContent ?? "{}");
    expect(chips.orgMaturity).toEqual({ value: "mixed", source: "manual" });
  });
});

describe("PersonaEditor refine → edit → save round-trip", () => {
  it("refines, announces, enables Save, and saves the full shape", async () => {
    const user = userEvent.setup();
    const { refineMutate, updateMutate } = setup({ persona: null });
    refineMutate.mockImplementation((_src: string, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess(makeRefinementResult())
    );
    updateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (p: unknown) => void }) =>
      opts.onSuccess(makeDonorPersona())
    );

    renderWithProviders(<PersonaEditor handleId="h1" />);

    const refineBtn = screen.getByRole("button", { name: /^refine$/i });
    expect(refineBtn).toBeDisabled(); // empty source < 10 chars

    await user.type(screen.getByLabelText("Persona source"), "Donor funds local education");
    expect(refineBtn).toBeEnabled();

    await user.click(refineBtn);

    // Narrative hydrated + polite announcement fired.
    expect(
      screen.getByText(/An established local funder with a multi-decade focus/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Persona narrative updated")).toBeInTheDocument();

    // Refine made the editor dirty → Save enabled even with no manual edit.
    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const input = updateMutate.mock.calls[0][0] as {
      sourceText: string | null;
      structured: Record<string, unknown>;
      amountMin: number | null;
      amountMax: number | null;
      cause: string | null;
      geography: string | null;
    };
    expect(input.sourceText).toBe("Donor funds local education");
    expect(Object.keys(input.structured)).toEqual([
      "orgMaturity",
      "geoRadius",
      "faithStance",
      "giftSizeBand",
      "advocacyStance",
    ]);
    // The refine-extracted scalars must ride along into the PUT so they persist.
    expect(input.amountMin).toBe(5000);
    expect(input.amountMax).toBe(20000);
    expect(input.cause).toBe("education");
    expect(input.geography).toBe("Greater Boston");
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Persona saved"));
  });
});

describe("PersonaEditor save callback", () => {
  it("calls onSaved after a successful save (so the host modal can close)", async () => {
    const user = userEvent.setup();
    const { updateMutate } = setup({
      persona: makeDonorPersona({ narrative: null, structured: emptyPersonaStructured() }),
    });
    updateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (p: unknown) => void }) =>
      opts.onSuccess(makeDonorPersona())
    );
    const onSaved = vi.fn();
    renderWithProviders(<PersonaEditor handleId="h1" onSaved={onSaved} />);

    await user.click(screen.getByText("edit-chip")); // make dirty → enable Save
    await user.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});

describe("PersonaEditor mobile sticky save", () => {
  it("wraps Save in a viewport-sticky container", () => {
    setup({ persona: null });
    renderWithProviders(<PersonaEditor handleId="h1" />);
    expect(saveButton().parentElement?.className).toContain("sticky");
  });
});
