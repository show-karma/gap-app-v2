import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { EditSourceDialog } from "@/components/Pages/Admin/KnowledgeBasePage/EditSourceDialog";
import { useEditKnowledgeSource } from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import type { KnowledgeSource } from "@/types/v2/knowledge-base";
import "@testing-library/jest-dom";

// DEV-202: tests for the edit dialog's content-affecting gating, dup
// collision toast, and content-projection of the form into the patch.
// The hook is mocked — we assert what `mutateAsync` receives, not the
// network call. Hydration is covered in SourceRow.test.tsx.

vi.mock("@/hooks/knowledge-base/useKnowledgeSourceMutations", () => ({
  useEditKnowledgeSource: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const mockEdit = useEditKnowledgeSource as ReturnType<typeof vi.fn>;
const toastMock = toast as unknown as { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const createSource = (overrides: Partial<KnowledgeSource> = {}): KnowledgeSource => ({
  id: "src-1",
  communityId: "comm-1",
  programId: null,
  kind: "url",
  externalId: "https://example.com/old",
  title: "Old title",
  isActive: true,
  paused: false,
  goal: "old purpose",
  syncIntervalMin: 1440,
  followLinks: false,
  lastSyncedAt: "2026-04-26T00:00:00.000Z",
  lastSyncStatus: "success",
  lastSyncError: null,
  lastSyncStats: {},
  createdAt: "2026-04-26T00:00:00.000Z",
  updatedAt: "2026-04-26T00:00:00.000Z",
  ...overrides,
});

function renderDialog(source: KnowledgeSource) {
  return render(
    <EditSourceDialog
      communityIdOrSlug="filecoin"
      source={source}
      open
      onOpenChange={() => undefined}
    />,
    { wrapper: Wrapper }
  );
}

describe("EditSourceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("save gating", () => {
    it("disables Save when no fields have changed", () => {
      mockEdit.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
      renderDialog(createSource());

      expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });

    it("enables Save when title is edited", async () => {
      mockEdit.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
      renderDialog(createSource());

      const user = userEvent.setup();
      const titleInput = screen.getByDisplayValue("Old title");
      await user.clear(titleInput);
      await user.type(titleInput, "New title");

      expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
    });
  });

  describe("title-only edit (no confirmation)", () => {
    it("commits a title-only change directly without showing the confirmation modal", async () => {
      // Display-only edits must bypass the confirmation step — burning a
      // re-sync on every typo fix would punish curators for low-stakes
      // changes. Backend's change-detection independently guarantees
      // markPendingSync isn't called.
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      mockEdit.mockReturnValue({ mutateAsync, isPending: false });
      renderDialog(createSource());

      const user = userEvent.setup();
      const titleInput = screen.getByDisplayValue("Old title");
      await user.clear(titleInput);
      await user.type(titleInput, "Renamed");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(
        screen.queryByRole("heading", { name: /apply re-sync changes/i })
      ).not.toBeInTheDocument();

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          sourceId: "src-1",
          patch: { title: "Renamed" },
        });
      });
    });
  });

  describe("content-affecting edits (confirmation gates)", () => {
    it("shows the confirmation modal before saving when goal changes", async () => {
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      mockEdit.mockReturnValue({ mutateAsync, isPending: false });
      renderDialog(createSource());

      const user = userEvent.setup();
      const goalInput = screen.getByDisplayValue("old purpose");
      await user.clear(goalInput);
      await user.type(goalInput, "fresh purpose");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      // Confirmation appears; mutation has NOT fired yet.
      expect(
        screen.getByText(/apply re-sync changes/i)
      ).toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();

      // Confirm — mutation fires with the goal in the patch.
      await user.click(screen.getByRole("button", { name: /apply changes/i }));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          sourceId: "src-1",
          patch: { goal: "fresh purpose" },
        });
      });
    });

    it("shows the confirmation modal before saving when externalId changes", async () => {
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      mockEdit.mockReturnValue({ mutateAsync, isPending: false });
      renderDialog(createSource());

      const user = userEvent.setup();
      const linkInput = screen.getByDisplayValue("https://example.com/old");
      await user.clear(linkInput);
      await user.type(linkInput, "https://example.com/new");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(screen.getByText(/apply re-sync changes/i)).toBeInTheDocument();
      expect(mutateAsync).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: /apply changes/i }));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          sourceId: "src-1",
          patch: { externalId: "https://example.com/new" },
        });
      });
    });

    it("does NOT save when the user cancels the confirmation", async () => {
      // Confirm-then-cancel must abort the patch entirely. Otherwise the
      // mutation could fire after the curator backed out, which is the
      // worst possible outcome for a content-affecting edit.
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      mockEdit.mockReturnValue({ mutateAsync, isPending: false });
      renderDialog(createSource());

      const user = userEvent.setup();
      const goalInput = screen.getByDisplayValue("old purpose");
      await user.clear(goalInput);
      await user.type(goalInput, "different");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      // Confirmation modal renders both a Cancel and an Apply button.
      // Click Cancel within the confirmation context — match the one
      // sitting alongside "Apply changes" using getAllByRole and the
      // last index (the confirmation modal is layered on top).
      const cancelButtons = screen.getAllByRole("button", { name: /cancel/i });
      await cancelButtons[cancelButtons.length - 1].click();

      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe("duplicate externalId error", () => {
    it("shows a duplicate-specific toast when the backend returns AlreadyExists", async () => {
      // Backend's `KnowledgeSourceAlreadyExistsException` surfaces via
      // fetchData's error string ("Knowledge source already registered
      // for community=…"). The dialog must convert that into specific
      // copy so the curator immediately sees it's a collision, not a
      // transport error or generic 500.
      const mutateAsync = vi
        .fn()
        .mockRejectedValue(
          new Error(
            "Knowledge source already registered for community=filecoin, kind=url, externalId=https://example.com/taken"
          )
        );
      mockEdit.mockReturnValue({ mutateAsync, isPending: false });
      renderDialog(createSource());

      const user = userEvent.setup();
      const linkInput = screen.getByDisplayValue("https://example.com/old");
      await user.clear(linkInput);
      await user.type(linkInput, "https://example.com/taken");
      await user.click(screen.getByRole("button", { name: /save changes/i }));
      await user.click(screen.getByRole("button", { name: /apply changes/i }));

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith(
          expect.stringMatching(/already registered/i)
        );
      });
      // Generic fallback must not have fired.
      expect(toastMock.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/^failed to update/i)
      );
    });

    it("falls back to the server message for non-duplicate errors", async () => {
      const mutateAsync = vi
        .fn()
        .mockRejectedValue(new Error("Connection lost"));
      mockEdit.mockReturnValue({ mutateAsync, isPending: false });
      renderDialog(createSource());

      const user = userEvent.setup();
      const titleInput = screen.getByDisplayValue("Old title");
      await user.clear(titleInput);
      await user.type(titleInput, "Renamed");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith("Connection lost");
      });
    });
  });

  describe("goal tri-state", () => {
    it("clears goal to null when the field is emptied", async () => {
      // Curator wipes the textarea — the patch must contain `goal: null`
      // (key present), not omit the key. Otherwise the backend leaves
      // the old goal in place.
      const mutateAsync = vi.fn().mockResolvedValue(undefined);
      mockEdit.mockReturnValue({ mutateAsync, isPending: false });
      renderDialog(createSource({ goal: "delete me" }));

      const user = userEvent.setup();
      await user.clear(screen.getByDisplayValue("delete me"));
      await user.click(screen.getByRole("button", { name: /save changes/i }));
      await user.click(screen.getByRole("button", { name: /apply changes/i }));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          sourceId: "src-1",
          patch: { goal: null },
        });
      });
    });
  });

  describe("followLinks toggle (gdrive_file only)", () => {
    it("does NOT show the follow-links toggle for url kind", () => {
      mockEdit.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
      renderDialog(createSource({ kind: "url" }));

      expect(
        screen.queryByLabelText(/follow links to other google docs/i)
      ).not.toBeInTheDocument();
    });

    it("shows the follow-links toggle for gdrive_file kind", () => {
      mockEdit.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
      renderDialog(
        createSource({ kind: "gdrive_file", externalId: "doc-1234" })
      );

      expect(
        screen.getByLabelText(/follow links to other google docs/i, {
          exact: false,
        })
      ).toBeInTheDocument();
    });
  });
});
