import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import { PrivateNotesTab } from "@/src/features/application-notes/components/PrivateNotesTab";
import { useApplicationNote } from "@/src/features/application-notes/hooks/use-application-note";
import type { ApplicationNote } from "@/src/features/application-notes/types";

vi.mock("@/src/features/application-notes/hooks/use-application-note", () => ({
  useApplicationNote: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

// The shared identity component pulls in React Query / Privy context; stub it to
// the raw address so this suite can assert the byline delegates to it (no local
// truncation) without wiring up those providers.
vi.mock("@/components/EthereumAddressToProfileName", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

const mockHook = vi.mocked(useApplicationNote);

type HookReturn = ReturnType<typeof useApplicationNote>;

function hookState(overrides: Partial<HookReturn> = {}): HookReturn {
  return {
    note: null,
    isLoading: false,
    error: null,
    saveNote: vi.fn(),
    isSaving: false,
    refetch: vi.fn(),
    ...overrides,
  } as HookReturn;
}

function createMockNote(overrides: Partial<ApplicationNote> = {}): ApplicationNote {
  return {
    id: "note-1",
    applicationId: "app-1",
    programId: "program-1",
    content: "internal flag",
    updatedByAddress: "0xabcdef0000000000000000000000000000000000",
    updatedByName: "Greta",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("PrivateNotesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render NOTHING when canViewNotes is false (no glimpse for non-reviewers)", () => {
    const { container } = render(<PrivateNotesTab referenceNumber="APP-1" canViewNotes={false} />);

    expect(container).toBeEmptyDOMElement();
    // The gate wrapper must not even invoke the data hook.
    expect(mockHook).not.toHaveBeenCalled();
  });

  it("should render the loading state", () => {
    mockHook.mockReturnValue(hookState({ isLoading: true }));

    render(<PrivateNotesTab referenceNumber="APP-1" canViewNotes />);

    expect(screen.getByTestId("notes-loading-spinner")).toBeInTheDocument();
  });

  it("should render an error state with a retry action", () => {
    mockHook.mockReturnValue(hookState({ error: new Error("Forbidden") }));

    render(<PrivateNotesTab referenceNumber="APP-1" canViewNotes />);

    expect(screen.getByText(/Failed to load note/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("should render an empty editor when no note exists yet", () => {
    mockHook.mockReturnValue(hookState({ note: null }));

    render(<PrivateNotesTab referenceNumber="APP-1" canViewNotes />);

    expect(
      screen.getByPlaceholderText(/private note visible only to reviewers/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/No note yet/)).toBeInTheDocument();
  });

  it("should render the note content and last-edited attribution", () => {
    mockHook.mockReturnValue(hookState({ note: createMockNote() }));

    render(<PrivateNotesTab referenceNumber="APP-1" canViewNotes />);

    expect(screen.getByDisplayValue("internal flag")).toBeInTheDocument();
    expect(screen.getByText(/Last edited by Greta/)).toBeInTheDocument();
  });

  it("delegates editor identity to the shared component when the note has no stored name", () => {
    mockHook.mockReturnValue(hookState({ note: createMockNote({ updatedByName: null }) }));

    render(<PrivateNotesTab referenceNumber="APP-1" canViewNotes />);

    expect(screen.getByText(/Last edited by/)).toBeInTheDocument();
    // Falls through to EthereumAddressToProfileName (name/ENS/masked) instead of
    // the old home-grown 6/4 truncation of the raw address.
    expect(screen.queryByText(/0xabcd…0000/)).not.toBeInTheDocument();
    expect(screen.getByText("0xabcdef0000000000000000000000000000000000")).toBeInTheDocument();
  });

  it("should surface an error toast when saving fails (not silent)", async () => {
    const saveNote = vi.fn().mockRejectedValue(new Error("Forbidden"));
    mockHook.mockReturnValue(hookState({ note: createMockNote(), saveNote }));

    render(<PrivateNotesTab referenceNumber="APP-1" canViewNotes />);

    // Make the editor dirty so Save is enabled, then click it.
    fireEvent.change(screen.getByLabelText("Private note"), {
      target: { value: "updated note" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(saveNote).toHaveBeenCalledWith("updated note"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
