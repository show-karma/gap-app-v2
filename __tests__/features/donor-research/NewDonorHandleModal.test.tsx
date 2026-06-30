/**
 * Donor-handle creation modal. Drives the real NewDonorHandleModal with the
 * persona editor + notes stubbed (they have their own suites), and verifies:
 * step-1 create gating, the two step-1 actions (skip vs. continue), auto-select
 * via onCreated, and the dismissal guard when the persona has unsaved edits.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCreateDonorHandle } from "@/hooks/useDonorHandles";
import { NewDonorHandleModal } from "@/src/features/donor-research/components/criteria-input/NewDonorHandleModal";
import { makeDonorHandle } from "../../msw/handlers/donor-research.handlers";
import { renderWithProviders } from "../../utils/render";

vi.mock("@/hooks/useDonorHandles", () => ({ useCreateDonorHandle: vi.fn() }));

// Stub the heavy step-2 children — exercised by their own tests. The editor
// stub exposes a button that flips the dirty flag the modal guards on.
vi.mock("@/src/features/donor-research/components/donor-detail/PersonaEditor", () => ({
  PersonaEditor: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => (
    <button type="button" onClick={() => onDirtyChange?.(true)}>
      flag dirty
    </button>
  ),
}));

vi.mock("@/src/features/donor-research/components/donor-detail/HandleNotesSection", () => ({
  HandleNotesSection: () => <div data-testid="handle-notes" />,
}));

const mockUseCreateDonorHandle = vi.mocked(useCreateDonorHandle);

const NEW_HANDLE = makeDonorHandle({ id: "h-new", opaqueLabel: "Smith Family Q3" });

function mockCreate(mutateAsync = vi.fn().mockResolvedValue(NEW_HANDLE)) {
  mockUseCreateDonorHandle.mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateDonorHandle>);
  return mutateAsync;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate();
});

/** Renders the modal open and walks step 1 → the persona step. */
async function renderAtPersonaStep() {
  const user = userEvent.setup();
  const onCreated = vi.fn();
  const onOpenChange = vi.fn();
  renderWithProviders(
    <NewDonorHandleModal open onOpenChange={onOpenChange} onCreated={onCreated} />
  );
  await user.type(screen.getByLabelText("New donor handle name"), "Smith Family Q3");
  await user.click(screen.getByRole("button", { name: /create & add persona/i }));
  await screen.findByText("Set up Smith Family Q3's persona");
  return { user, onCreated, onOpenChange };
}

describe("NewDonorHandleModal", () => {
  it("gates the create actions until a label is typed", () => {
    renderWithProviders(<NewDonorHandleModal open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByRole("button", { name: /create & add persona/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /just create handle/i })).toBeDisabled();
  });

  it("creates and closes without the persona step via 'Just create handle'", async () => {
    const user = userEvent.setup();
    const mutateAsync = mockCreate();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    renderWithProviders(
      <NewDonorHandleModal open onOpenChange={onOpenChange} onCreated={onCreated} />
    );

    await user.type(screen.getByLabelText("New donor handle name"), "Smith Family Q3");
    await user.click(screen.getByRole("button", { name: /just create handle/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("h-new"));
    expect(mutateAsync).toHaveBeenCalledWith({ opaqueLabel: "Smith Family Q3" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText(/'s persona$/)).not.toBeInTheDocument();
  });

  it("creates the handle, selects it, and advances to the optional persona step", async () => {
    const mutateAsync = mockCreate();
    const { onCreated } = await renderAtPersonaStep();

    expect(mutateAsync).toHaveBeenCalledWith({ opaqueLabel: "Smith Family Q3" });
    expect(onCreated).toHaveBeenCalledWith("h-new");
    expect(screen.getByText("Step 2 of 2 · Persona")).toBeInTheDocument();
  });

  it("opens straight into the persona editor when editing an existing handle", async () => {
    renderWithProviders(
      <NewDonorHandleModal
        open
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        editHandle={NEW_HANDLE}
      />
    );

    // No name step — goes directly to the (edit-mode) persona editor.
    expect(screen.queryByLabelText("New donor handle name")).not.toBeInTheDocument();
    expect(await screen.findByText("Edit persona")).toBeInTheDocument();
    expect(screen.getByText("Edit Smith Family Q3's persona")).toBeInTheDocument();
  });

  it("closes without a prompt when the persona is untouched", async () => {
    const { user, onOpenChange } = await renderAtPersonaStep();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Discard persona changes?")).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("guards dismissal once the persona has unsaved edits", async () => {
    const { user, onOpenChange } = await renderAtPersonaStep();

    await user.click(screen.getByRole("button", { name: /flag dirty/i }));
    await user.keyboard("{Escape}");

    // The modal is held open and asks first — no close yet.
    expect(await screen.findByText("Discard persona changes?")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    // Discarding then releases the modal.
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^discard$/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
