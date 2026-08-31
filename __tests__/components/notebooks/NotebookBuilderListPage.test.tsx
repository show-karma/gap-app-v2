import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotebookBuilderListPage } from "@/components/Pages/Admin/Notebooks/NotebookBuilderListPage";
import { NOTEBOOK_SEED_SPEC } from "@/services/notebooks/notebook-seed-spec";
import type { NotebookConfig } from "@/services/notebooks.service";
import type { Community } from "@/types/v2/community";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}));

const mockAccess = vi.fn();
vi.mock("@/hooks/communities/useCommunityAdminAccess", () => ({
  useCommunityAdminAccess: () => mockAccess(),
}));

const mockList = vi.fn();
const setStatusMutate = vi.fn();
const deleteMutate = vi.fn();
vi.mock("@/hooks/notebooks/useNotebookBuilder", () => ({
  useAdminNotebooks: () => mockList(),
  useSetNotebookStatus: () => ({ mutateAsync: setStatusMutate, isPending: false }),
  useDeleteNotebook: () => ({ mutateAsync: deleteMutate, isPending: false }),
}));

const community = {
  uid: "0xfilecoin",
  details: { slug: "filecoin", name: "Filecoin" },
} as unknown as Community;

function makeNotebook(overrides: Partial<NotebookConfig> = {}): NotebookConfig {
  return {
    id: "cfg-1",
    communityId: "0xfilecoin",
    slug: "grants-overview",
    name: "Grants & milestones overview",
    description: null,
    spec: NOTEBOOK_SEED_SPEC,
    status: "published",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  } as NotebookConfig;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAccess.mockReturnValue({ hasAccess: true, isLoading: false });
  mockList.mockReturnValue({
    data: [makeNotebook()],
    isLoading: false,
    isError: false,
    error: null,
  });
  setStatusMutate.mockResolvedValue(makeNotebook());
  deleteMutate.mockResolvedValue(undefined);
});

describe("NotebookBuilderListPage", () => {
  it("lists drafts alongside published pages", () => {
    mockList.mockReturnValue({
      data: [
        makeNotebook(),
        makeNotebook({ slug: "wip", name: "Work in progress", status: "draft" }),
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<NotebookBuilderListPage community={community} />);

    expect(screen.getByText("Grants & milestones overview")).toBeInTheDocument();
    expect(screen.getByText("Work in progress")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  // SC4 on the client: the server enforces it, but a non-admin must not be
  // shown a builder that will 403 on every action.
  it("refuses to render the builder without admin access", () => {
    mockAccess.mockReturnValue({ hasAccess: false, isLoading: false });

    render(<NotebookBuilderListPage community={community} />);

    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    expect(screen.queryByText("New page")).not.toBeInTheDocument();
  });

  // A failed load is NOT an empty list. "No pages yet" would invite an author
  // to recreate a page that already exists, and hide an outage behind it.
  it("distinguishes a failed load from an empty list", () => {
    mockList.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Service unavailable"),
    });

    render(<NotebookBuilderListPage community={community} />);

    expect(screen.getByText(/Could not load your notebook pages/i)).toBeInTheDocument();
    expect(screen.queryByText(/No notebook pages yet/i)).not.toBeInTheDocument();
  });

  it("offers the empty state only when the list really is empty", () => {
    mockList.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });

    render(<NotebookBuilderListPage community={community} />);

    expect(screen.getByText(/No notebook pages yet/i)).toBeInTheDocument();
  });

  /**
   * FC8 — the property that actually broke, asserted as a composition.
   *
   * The API tests and the schema tests were all green while one corrupted row
   * removed the entire builder for a community. What was missing was a test
   * that put a bad row and a good row in the same list and checked the admin
   * could still work.
   */
  describe("a corrupted row costs one card, not the builder", () => {
    const withBrokenRow = () =>
      mockList.mockReturnValue({
        data: [
          makeNotebook(),
          makeNotebook({
            slug: "broken",
            name: "Broken page",
            // The mapper forces an unrenderable row to draft, so a fixture
            // that leaves it published is not a state the server can produce.
            status: "draft",
            spec: null,
            specError: "The stored page layout could not be read by this version.",
          } as Partial<NotebookConfig>),
        ],
        isLoading: false,
        isError: false,
        error: null,
      });

    it("still lists the healthy page", () => {
      withBrokenRow();

      render(<NotebookBuilderListPage community={community} />);

      expect(screen.getByText("Grants & milestones overview")).toBeInTheDocument();
      expect(screen.queryByText(/Could not load your notebook pages/i)).not.toBeInTheDocument();
    });

    it("names the broken page and says what to do about it", () => {
      withBrokenRow();

      render(<NotebookBuilderListPage community={community} />);

      expect(screen.getByText("Broken page")).toBeInTheDocument();
      expect(screen.getByText(/could not be read/i)).toBeInTheDocument();
    });

    // Delete is the repair, so it stays available on the broken row.
    it("still offers delete on the broken page", async () => {
      withBrokenRow();

      render(<NotebookBuilderListPage community={community} />);
      await userEvent.click(screen.getByRole("button", { name: /Delete Broken page/i }));
      await userEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith("broken"));
    });

    // F7. The message tells the admin to rebuild the page, so the control that
    // does it must work. It used to be greyed out, which left the copy
    // promising a repair through a disabled button.
    it("offers Rebuild on the broken page, and it is not disabled", () => {
      withBrokenRow();

      render(<NotebookBuilderListPage community={community} />);

      expect(screen.getByRole("button", { name: /^Rebuild$/i })).toBeEnabled();
    });

    it("tells the admin to rebuild rather than promising a republish that does not exist", () => {
      withBrokenRow();

      render(<NotebookBuilderListPage community={community} />);

      expect(screen.getByText(/Rebuild its layout, or delete it/i)).toBeInTheDocument();
    });

    // Publishing an unreadable page is refused by the server, so offering it
    // would promise something that cannot happen.
    it("still withholds publish on the broken page", () => {
      withBrokenRow();

      render(<NotebookBuilderListPage community={community} />);

      expect(screen.getByRole("button", { name: /^Publish$/i })).toBeDisabled();
    });
  });

  describe("publish and unpublish", () => {
    it("unpublishes a published page", async () => {
      render(<NotebookBuilderListPage community={community} />);

      await userEvent.click(screen.getByRole("button", { name: /unpublish/i }));

      await waitFor(() =>
        expect(setStatusMutate).toHaveBeenCalledWith({ slug: "grants-overview", status: "draft" })
      );
    });

    it("publishes a draft", async () => {
      mockList.mockReturnValue({
        data: [makeNotebook({ status: "draft" })],
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<NotebookBuilderListPage community={community} />);

      await userEvent.click(screen.getByRole("button", { name: /publish/i }));

      await waitFor(() =>
        expect(setStatusMutate).toHaveBeenCalledWith({
          slug: "grants-overview",
          status: "published",
        })
      );
    });

    it("reports a failure instead of implying the change stuck", async () => {
      setStatusMutate.mockRejectedValue(new Error("nope"));

      render(<NotebookBuilderListPage community={community} />);
      await userEvent.click(screen.getByRole("button", { name: /unpublish/i }));

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(toastSuccess).not.toHaveBeenCalled();
    });

    // A draft has no public page, so linking to one would send an admin to a
    // 404 on their own unpublished work.
    it("links to the public page only once it is published", () => {
      mockList.mockReturnValue({
        data: [makeNotebook({ status: "draft" })],
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<NotebookBuilderListPage community={community} />);

      expect(screen.queryByText("View")).not.toBeInTheDocument();
    });
  });

  // Umbrella checklist: destructive actions require a confirmation dialog.
  describe("delete", () => {
    it("does not delete on the first click — it asks first", async () => {
      render(<NotebookBuilderListPage community={community} />);

      await userEvent.click(
        screen.getByRole("button", { name: /Delete Grants & milestones overview/i })
      );

      expect(deleteMutate).not.toHaveBeenCalled();
      expect(
        screen.getByText(/Delete "Grants & milestones overview"\? This permanently removes/i)
      ).toBeInTheDocument();
    });

    it("names the page and says it cannot be undone", async () => {
      render(<NotebookBuilderListPage community={community} />);

      await userEvent.click(
        screen.getByRole("button", { name: /Delete Grants & milestones overview/i })
      );

      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it("deletes only after the confirmation is accepted", async () => {
      render(<NotebookBuilderListPage community={community} />);

      await userEvent.click(
        screen.getByRole("button", { name: /Delete Grants & milestones overview/i })
      );
      await userEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith("grants-overview"));
    });

    it("deletes nothing when the confirmation is cancelled", async () => {
      render(<NotebookBuilderListPage community={community} />);

      await userEvent.click(
        screen.getByRole("button", { name: /Delete Grants & milestones overview/i })
      );
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(deleteMutate).not.toHaveBeenCalled();
    });
  });
});
