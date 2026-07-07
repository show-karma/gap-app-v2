/**
 * U7 — PersonaEditor state-machine tests.
 *
 * The persona hooks, toast, and the Radix-based chips are mocked so the test
 * exercises the editor's local state machine (hydration, dirty gating,
 * refine→accept/reject→save, aria-live) without Radix Select interaction in
 * jsdom.
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

const NARRATIVE = "An established local funder with a multi-decade focus on education access.";

const saveButton = () => screen.getByRole("button", { name: /save persona/i });
// The Accept button only exists while a refine suggestion awaits a decision.
const acceptButton = () => screen.queryByRole("button", { name: /^accept$/i });

describe("PersonaEditor cold-mount states", () => {
  it("1) no persona: empty field, no recommendation card, Save disabled", () => {
    setup({ persona: null });
    renderWithProviders(<PersonaEditor handleId="h1" />);

    expect(screen.getByLabelText("Persona source")).toHaveValue("");
    expect(acceptButton()).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("2) exists but never refined: field shows the raw source, Save disabled", () => {
    setup({
      persona: makeDonorPersona({
        narrative: null,
        sourceText: "kickoff notes about this donor",
        structured: emptyPersonaStructured(),
      }),
    });
    renderWithProviders(<PersonaEditor handleId="h1" />);

    expect(screen.getByLabelText("Persona source")).toHaveValue("kickoff notes about this donor");
    expect(saveButton()).toBeDisabled();
  });

  it("3) refined and untouched: the single field shows the narrative, Save disabled (not dirty)", () => {
    setup({ persona: makeDonorPersona() });
    renderWithProviders(<PersonaEditor handleId="h1" />);

    expect(screen.getByLabelText("Persona source")).toHaveValue(NARRATIVE);
    expect(acceptButton()).not.toBeInTheDocument();
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

describe("PersonaEditor refine → accept → save round-trip", () => {
  it("shows the recommendation for review, applies it on Accept, and saves the full shape", async () => {
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

    // Refine writes the suggestion straight into the (still editable) field;
    // chips/scalars wait for the Accept decision.
    expect(screen.getByLabelText("Persona source")).toHaveValue(NARRATIVE);
    expect(screen.getByLabelText("Persona source")).not.toHaveAttribute("readonly");
    expect(acceptButton()).toBeInTheDocument();
    expect(
      screen.getByText("Recommended persona written to the input — accept or reject below")
    ).toBeInTheDocument();
    const chipsBefore = JSON.parse(screen.getByTestId("chips-json").textContent ?? "{}");
    expect(chipsBefore.orgMaturity.value).toBeNull();
    // Refine and Save yield to the decision bar while it's pending.
    expect(screen.queryByRole("button", { name: /^refine$/i })).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /^accept$/i }));

    // Accept keeps the field text, applies chips, enables Save.
    expect(acceptButton()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Persona source")).toHaveValue(NARRATIVE);
    const chipsAfter = JSON.parse(screen.getByTestId("chips-json").textContent ?? "{}");
    expect(chipsAfter.orgMaturity).toEqual({ value: "established", source: "extracted" });
    expect(saveButton()).toBeEnabled();

    await user.click(saveButton());

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const input = updateMutate.mock.calls[0][0] as {
      sourceText: string | null;
      narrative: string | null;
      structured: Record<string, unknown>;
      amountMin: number | null;
      amountMax: number | null;
      cause: string | null;
      geography: string | null;
    };
    // The single field is the persona: it persists as both source and narrative.
    expect(input.sourceText).toBe(NARRATIVE);
    expect(input.narrative).toBe(NARRATIVE);
    // Only the chips the refine actually filled are sent. makeRefinementResult
    // sets orgMaturity + geoRadius and leaves the other three null; the unset
    // chips must be OMITTED (the backend's PUT rejects a null chip value).
    expect(Object.keys(input.structured)).toEqual(["orgMaturity", "geoRadius"]);
    expect(input.structured.faithStance).toBeUndefined();
    expect(input.structured.giftSizeBand).toBeUndefined();
    expect(input.structured.advocacyStance).toBeUndefined();
    // The refine-extracted scalars must ride along into the PUT so they persist.
    expect(input.amountMin).toBe(5000);
    expect(input.amountMax).toBe(20000);
    expect(input.cause).toBe("education");
    expect(input.geography).toBe("Greater Boston");
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Persona saved"));
  });

  it("restores the pre-refine text on Reject and leaves the chips untouched", async () => {
    const user = userEvent.setup();
    const { refineMutate, updateMutate } = setup({ persona: null });
    refineMutate.mockImplementation((_src: string, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess(makeRefinementResult())
    );
    renderWithProviders(<PersonaEditor handleId="h1" />);

    await user.type(screen.getByLabelText("Persona source"), "Donor funds local education");
    await user.click(screen.getByRole("button", { name: /^refine$/i }));
    // The suggestion replaced the field text…
    expect(screen.getByLabelText("Persona source")).toHaveValue(NARRATIVE);

    await user.click(screen.getByRole("button", { name: /^reject$/i }));

    // …and Reject puts the original text back.
    expect(acceptButton()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Persona source")).toHaveValue("Donor funds local education");
    const chips = JSON.parse(screen.getByTestId("chips-json").textContent ?? "{}");
    expect(chips.orgMaturity.value).toBeNull();
    // Back to the input state: Refine returns, ready to try again.
    expect(screen.getByRole("button", { name: /^refine$/i })).toBeEnabled();
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it("marks the editor dirty while a suggestion is pending (guards refetch clobber + host dismissal)", async () => {
    const user = userEvent.setup();
    const { refineMutate } = setup({ persona: makeDonorPersona() });
    refineMutate.mockImplementation((_src: string, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess(makeRefinementResult())
    );
    const onDirtyChange = vi.fn();
    renderWithProviders(<PersonaEditor handleId="h1" onDirtyChange={onDirtyChange} />);

    // Refine without typing first — the suggestion alone must flip dirty so a
    // background refetch can't clobber the in-field suggestion and the host
    // modal guards against accidental dismissal mid-review.
    await user.click(screen.getByRole("button", { name: /^refine$/i }));

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    // Rejecting restores the pre-refine dirty state: the editor was clean, so
    // no phantom dirty flag lingers to enable a no-op Save or trip the guard.
    await user.click(screen.getByRole("button", { name: /^reject$/i }));

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("saves hand-tweaks made to the suggestion before Accept", async () => {
    const user = userEvent.setup();
    const { refineMutate, updateMutate } = setup({ persona: null });
    refineMutate.mockImplementation((_src: string, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess(makeRefinementResult())
    );
    updateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (p: unknown) => void }) =>
      opts.onSuccess(makeDonorPersona())
    );
    renderWithProviders(<PersonaEditor handleId="h1" />);

    await user.type(screen.getByLabelText("Persona source"), "Donor funds local education");
    await user.click(screen.getByRole("button", { name: /^refine$/i }));
    // The suggestion is editable in place — tweak it before accepting.
    await user.type(screen.getByLabelText("Persona source"), " Prefers spring grants.");
    await user.click(screen.getByRole("button", { name: /^accept$/i }));
    await user.click(saveButton());

    const input = updateMutate.mock.calls[0][0] as {
      sourceText: string | null;
      narrative: string | null;
    };
    expect(input.sourceText).toBe(`${NARRATIVE} Prefers spring grants.`);
    expect(input.narrative).toBe(`${NARRATIVE} Prefers spring grants.`);
  });

  it("saves narrative: null when the source was typed but never refined", async () => {
    const user = userEvent.setup();
    const { updateMutate } = setup({ persona: null });
    updateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (p: unknown) => void }) =>
      opts.onSuccess(makeDonorPersona())
    );
    renderWithProviders(<PersonaEditor handleId="h1" />);

    await user.type(screen.getByLabelText("Persona source"), "Raw notes, never refined");
    await user.click(saveButton());

    const input = updateMutate.mock.calls[0][0] as {
      sourceText: string | null;
      narrative: string | null;
    };
    expect(input.sourceText).toBe("Raw notes, never refined");
    expect(input.narrative).toBeNull();
  });
});

describe("PersonaEditor save omits unset chips (S-001 regression)", () => {
  it("sends no `structured` key when saving a persona with all chips unset", async () => {
    const user = userEvent.setup();
    const { updateMutate } = setup({ persona: null });
    updateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (p: unknown) => void }) =>
      opts.onSuccess(makeDonorPersona())
    );
    renderWithProviders(<PersonaEditor handleId="h1" />);

    // Typing source makes the editor dirty without touching any chip.
    await user.type(screen.getByLabelText("Persona source"), "Donor notes with no chips set");
    await user.click(saveButton());

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const input = updateMutate.mock.calls[0][0] as { structured?: Record<string, unknown> };
    // No null chips in the body — the backend's PUT 400s on `{ value: null }`.
    expect(input.structured).toBeUndefined();
  });

  it("sends only the chips that were set, omitting the rest", async () => {
    const user = userEvent.setup();
    const { updateMutate } = setup({
      persona: makeDonorPersona({ narrative: null, structured: emptyPersonaStructured() }),
    });
    updateMutate.mockImplementation((_input: unknown, opts: { onSuccess: (p: unknown) => void }) =>
      opts.onSuccess(makeDonorPersona())
    );
    renderWithProviders(<PersonaEditor handleId="h1" />);

    await user.click(screen.getByText("edit-chip")); // sets orgMaturity → mixed
    await user.click(saveButton());

    const input = updateMutate.mock.calls[0][0] as { structured: Record<string, unknown> };
    expect(Object.keys(input.structured)).toEqual(["orgMaturity"]);
    expect(input.structured.orgMaturity).toEqual({ value: "mixed", source: "manual" });
  });
});

describe("PersonaEditor error & empty-refine feedback (S-003)", () => {
  it("warns and shows no recommendation when refine extracts nothing", async () => {
    const user = userEvent.setup();
    const { refineMutate } = setup({ persona: makeDonorPersona() });
    refineMutate.mockImplementation((_src: string, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess(
        makeRefinementResult({
          narrative: null,
          structured: emptyPersonaStructured(),
          amountMin: null,
          amountMax: null,
          cause: null,
          geography: null,
        })
      )
    );
    renderWithProviders(<PersonaEditor handleId="h1" />);

    // The existing persona shows in the field before refine.
    expect(screen.getByLabelText("Persona source")).toHaveValue(NARRATIVE);

    await user.click(screen.getByRole("button", { name: /^refine$/i }));

    // The feedback is a PERSISTENT inline notice (a toast alone auto-dismisses
    // and leaves the button looking like a silent no-op).
    expect(screen.getByText(/add more detail and try again/i)).toBeInTheDocument();
    // The empty result must NOT open a review card or touch the field.
    expect(acceptButton()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Persona source")).toHaveValue(NARRATIVE);

    // Typing clears the notice.
    await user.type(screen.getByLabelText("Persona source"), " more detail");
    expect(screen.queryByText(/add more detail and try again/i)).not.toBeInTheDocument();
  });

  it("shows a friendly message (not the raw backend error) when save fails", async () => {
    const user = userEvent.setup();
    const { updateMutate } = setup({
      persona: makeDonorPersona({ narrative: null, structured: emptyPersonaStructured() }),
    });
    updateMutate.mockImplementation((_input: unknown, opts: { onError: (e: unknown) => void }) =>
      opts.onError(
        new Error("body.structured.orgMaturity.value should be equal to one of the allowed values")
      )
    );
    renderWithProviders(<PersonaEditor handleId="h1" />);

    await user.click(screen.getByText("edit-chip")); // dirty → enable Save
    await user.click(saveButton());

    expect(toast.error).toHaveBeenCalledWith("Couldn't save the persona. Try again.");
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/allowed values/i));
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
