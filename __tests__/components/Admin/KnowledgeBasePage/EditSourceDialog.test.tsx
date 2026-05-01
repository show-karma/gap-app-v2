import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { EditSourceDialog } from "@/components/Pages/Admin/KnowledgeBasePage/EditSourceDialog";
import { useEditKnowledgeSource } from "@/hooks/knowledge-base/useKnowledgeSourceMutations";
import { KnowledgeBaseApiError } from "@/services/knowledge-base.service";
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
const toastMock = toast as unknown as {
  error: ReturnType<typeof vi.fn>;
  success: ReturnType<typeof vi.fn>;
};

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
      expect(screen.getByText(/apply re-sync changes/i)).toBeInTheDocument();
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

      // Scope the Cancel click to the confirmation modal. The edit
      // dialog also has a Cancel button, so an unscoped `getByRole`
      // would be ambiguous — `within` walks down from the confirmation
      // modal's root via its title, and we route through `userEvent` so
      // act-wrapping and pointer simulation match the rest of the suite.
      const confirmModal = screen
        .getByText(/apply re-sync changes/i)
        .closest('[role="dialog"]') as HTMLElement;
      await user.click(within(confirmModal).getByRole("button", { name: /cancel/i }));

      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe("duplicate externalId error", () => {
    it("shows a duplicate-specific toast when the service throws KnowledgeBaseApiError with status 409", async () => {
      // Primary detection path: structured error with HTTP status. The
      // service is responsible for preserving fetchData's status code
      // on the thrown error so callers don't have to parse the server
      // message — that decoupling is the whole point of the class.
      const mutateAsync = vi
        .fn()
        .mockRejectedValue(new KnowledgeBaseApiError("anything the server says", 409));
      mockEdit.mockReturnValue({ mutateAsync, isPending: false });
      renderDialog(createSource());

      const user = userEvent.setup();
      const linkInput = screen.getByDisplayValue("https://example.com/old");
      await user.clear(linkInput);
      await user.type(linkInput, "https://example.com/taken");
      await user.click(screen.getByRole("button", { name: /save changes/i }));
      await user.click(screen.getByRole("button", { name: /apply changes/i }));

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/already registered/i));
      });
    });

    it("falls back to message substring when status is unavailable (defensive)", async () => {
      // Defensive fallback: if some future code path strips the status
      // (e.g., re-throws as a plain Error) but keeps the server message
      // intact, we still detect the conflict so the curator sees the
      // specific copy. Drops to generic "Failed" toast only as a last
      // resort.
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
        expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/already registered/i));
      });
      expect(toastMock.error).not.toHaveBeenCalledWith(expect.stringMatching(/^failed to update/i));
    });

    it("does NOT fire the duplicate toast when status is a non-conflict (e.g., 500)", async () => {
      // A 500 with an unrelated message must fall through to the
      // generic toast. Previous text-only matcher could have matched
      // "already" inside a transport error message.
      const mutateAsync = vi
        .fn()
        .mockRejectedValue(new KnowledgeBaseApiError("Database connection lost", 500));
      mockEdit.mockReturnValue({ mutateAsync, isPending: false });
      renderDialog(createSource());

      const user = userEvent.setup();
      const titleInput = screen.getByDisplayValue("Old title");
      await user.clear(titleInput);
      await user.type(titleInput, "Renamed");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith("Database connection lost");
      });
      expect(toastMock.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/already registered/i)
      );
    });

    it("falls back to the server message for non-duplicate errors", async () => {
      const mutateAsync = vi.fn().mockRejectedValue(new Error("Connection lost"));
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

      expect(screen.queryByLabelText(/follow links to other google docs/i)).not.toBeInTheDocument();
    });

    it("shows the follow-links toggle for gdrive_file kind", () => {
      mockEdit.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
      renderDialog(createSource({ kind: "gdrive_file", externalId: "doc-1234" }));

      expect(
        screen.getByLabelText(/follow links to other google docs/i, {
          exact: false,
        })
      ).toBeInTheDocument();
    });
  });
});
