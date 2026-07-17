/**
 * Persona creation + profile modal. The profile editor and notes have their own
 * suites; these tests lock down the two-step create flow, in-place editing,
 * auto-selection, and the unsaved-profile dismissal guard.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCreateDonorHandle } from "@/hooks/useDonorHandles";
import { NewDonorHandleModal } from "@/src/features/donor-research/components/criteria-input/NewDonorHandleModal";
import { makeDonorHandle } from "../../msw/handlers/donor-research.handlers";
import { renderWithProviders } from "../../utils/render";

vi.mock("@/hooks/useDonorHandles", () => ({ useCreateDonorHandle: vi.fn() }));

vi.mock("@/src/features/donor-research/components/donor-detail/PersonaEditor", () => ({
  PersonaEditor: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => (
    <button onClick={() => onDirtyChange?.(true)} type="button">
      flag dirty
    </button>
  ),
}));

vi.mock("@/src/features/donor-research/components/donor-detail/HandleNotesSection", () => ({
  HandleNotesSection: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => (
    <button onClick={() => onDirtyChange?.(true)} type="button">
      flag notes dirty
    </button>
  ),
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

async function renderAtProfileStep() {
  const user = userEvent.setup();
  const onCreated = vi.fn();
  const onOpenChange = vi.fn();
  renderWithProviders(
    <NewDonorHandleModal onCreated={onCreated} onOpenChange={onOpenChange} open />
  );
  await user.type(screen.getByLabelText("New persona name"), "Smith Family Q3");
  await user.click(screen.getByRole("button", { name: /create & add profile/i }));
  await screen.findByText("Set up Smith Family Q3's profile");
  return { user, onCreated, onOpenChange };
}

describe("NewDonorHandleModal", () => {
  it("gates both create actions until a persona name is entered", () => {
    renderWithProviders(<NewDonorHandleModal onOpenChange={vi.fn()} open />);
    expect(screen.getByRole("button", { name: /create & add profile/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /create persona only/i })).toBeDisabled();
  });

  it("creates and closes without the profile step", async () => {
    const user = userEvent.setup();
    const mutateAsync = mockCreate();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    renderWithProviders(
      <NewDonorHandleModal onCreated={onCreated} onOpenChange={onOpenChange} open />
    );

    await user.type(screen.getByLabelText("New persona name"), "Smith Family Q3");
    await user.click(screen.getByRole("button", { name: /create persona only/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("h-new"));
    expect(mutateAsync).toHaveBeenCalledWith({ opaqueLabel: "Smith Family Q3" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("creates, selects, and continues into the optional profile step", async () => {
    const mutateAsync = mockCreate();
    const { onCreated } = await renderAtProfileStep();

    expect(mutateAsync).toHaveBeenCalledWith({ opaqueLabel: "Smith Family Q3" });
    expect(onCreated).toHaveBeenCalledWith("h-new");
    expect(screen.getByText("Step 2 of 2 · Profile")).toBeInTheDocument();
  });

  it("opens an existing persona directly in the profile editor", async () => {
    renderWithProviders(
      <NewDonorHandleModal editHandle={NEW_HANDLE} editPersonaExists onOpenChange={vi.fn()} open />
    );

    expect(screen.queryByLabelText("New persona name")).not.toBeInTheDocument();
    expect(await screen.findByText("Change profile")).toBeInTheDocument();
    expect(screen.getByText("Change Smith Family Q3's profile")).toBeInTheDocument();
  });

  it("closes without a prompt when the profile is untouched", async () => {
    const { user, onOpenChange } = await renderAtProfileStep();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Discard profile changes?")).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("guards dismissal when the profile has unsaved edits", async () => {
    const { user, onOpenChange } = await renderAtProfileStep();

    await user.click(screen.getByRole("button", { name: /flag dirty/i }));
    await user.keyboard("{Escape}");

    expect(await screen.findByText("Discard profile changes?")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^discard$/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("guards dismissal when only the private notes have unsaved edits", async () => {
    const { user, onOpenChange } = await renderAtProfileStep();

    // The persona editor stays clean; only the notes field is dirty. Closing
    // must still confirm rather than silently drop the note.
    await user.click(screen.getByRole("button", { name: /flag notes dirty/i }));
    await user.keyboard("{Escape}");

    expect(await screen.findByText("Discard profile changes?")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
