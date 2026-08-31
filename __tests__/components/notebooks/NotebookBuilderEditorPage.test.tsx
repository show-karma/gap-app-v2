import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotebookBuilderEditorPage } from "@/components/Pages/Admin/Notebooks/NotebookBuilderEditorPage";
import type { NotebookOverview } from "@/services/notebook-overview.service";
import { NOTEBOOK_SEED_SPEC } from "@/services/notebooks/notebook-seed-spec";
import type { NotebookConfig } from "@/services/notebooks.service";
import type { Community } from "@/types/v2/community";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

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

vi.mock("@/hooks/communities/useCommunityAdminAccess", () => ({
  useCommunityAdminAccess: () => ({ hasAccess: true, isLoading: false }),
}));

const mockDetail = vi.fn();
const createMutate = vi.fn();
const updateMutate = vi.fn();
vi.mock("@/hooks/notebooks/useNotebookBuilder", () => ({
  useAdminNotebook: () => mockDetail(),
  useCreateNotebook: () => ({ mutateAsync: createMutate, isPending: false }),
  useUpdateNotebook: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

const community = {
  uid: "0xfilecoin",
  details: { slug: "filecoin", name: "Filecoin" },
} as unknown as Community;

const overview: NotebookOverview = {
  source: "gap-api",
  stale: false,
  generatedAt: "2026-08-29T01:00:00.000Z",
  currency: "USDC",
  stats: [
    { id: "committed", label: "Committed", value: 9246697, format: "currency" },
    { id: "disbursed", label: "Disbursed", value: 6369766, format: "currency" },
    { id: "fundedProjects", label: "Funded projects", value: 48, format: "count" },
    { id: "milestoneCompletion", label: "Milestone completion", value: 52, format: "percent" },
  ],
  funding: [
    { label: "Batch 3", value: 0, total: 2168267, caption: "$0 of $2.2M", meta: "18 projects" },
  ],
  completion: [{ label: "Kernel", value: 1.3, total: 100, caption: "1.3%", meta: "13 projects" }],
  applications: [{ label: "Approved", value: 52 }],
};

function existingConfig(overrides: Partial<NotebookConfig> = {}): NotebookConfig {
  return {
    id: "cfg-1",
    communityId: "0xfilecoin",
    slug: "grants-overview",
    name: "Grants overview",
    description: "Existing description",
    spec: NOTEBOOK_SEED_SPEC,
    status: "draft",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  } as NotebookConfig;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDetail.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  createMutate.mockResolvedValue(existingConfig());
  updateMutate.mockResolvedValue(existingConfig());
});

describe("NotebookBuilderEditorPage — creating", () => {
  it("derives the URL slug from the page name", async () => {
    render(<NotebookBuilderEditorPage community={community} overview={overview} />);

    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Grants & Milestones");

    expect(screen.getByDisplayValue("grants-milestones")).toBeInTheDocument();
  });

  // A derived slug is a guess at what someone wants in their URL, not a
  // decision to make for them — once they edit it, it is theirs.
  it("stops deriving once the author edits the slug themselves", async () => {
    render(<NotebookBuilderEditorPage community={community} overview={overview} />);
    const nameField = screen.getByRole("textbox", { name: /name/i });

    await userEvent.type(nameField, "First");
    await userEvent.clear(screen.getByRole("textbox", { name: /url/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /url/i }), "custom-url");
    await userEvent.type(nameField, " Second");

    expect(screen.getByDisplayValue("custom-url")).toBeInTheDocument();
  });

  it("cannot be saved without a name", () => {
    render(<NotebookBuilderEditorPage community={community} overview={overview} />);

    expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled();
  });

  it("creates a draft without sending a status", async () => {
    render(<NotebookBuilderEditorPage community={community} overview={overview} />);

    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "My page");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalled());
    expect(createMutate.mock.calls[0][0]).toMatchObject({
      name: "My page",
      slug: "my-page",
      status: "draft",
    });
  });

  it("publishes when the author chooses to publish", async () => {
    render(<NotebookBuilderEditorPage community={community} overview={overview} />);

    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "My page");
    await userEvent.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalled());
    expect(createMutate.mock.calls[0][0]).toMatchObject({ status: "published" });
  });

  // A spec the UI thought was fine but the boundary rejected is exactly where
  // a generic message leaves an author with no way forward.
  it("surfaces what the server said when a save fails", async () => {
    createMutate.mockRejectedValue(new Error("bars.metric is not available for that source"));

    render(<NotebookBuilderEditorPage community={community} overview={overview} />);
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "My page");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("bars.metric is not available for that source")
    );
    expect(push).not.toHaveBeenCalled();
  });
});

describe("NotebookBuilderEditorPage — editing", () => {
  it("loads the existing page into the form", () => {
    mockDetail.mockReturnValue({ data: existingConfig(), isLoading: false, isError: false });

    render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );

    expect(screen.getByDisplayValue("Grants overview")).toBeInTheDocument();
    expect(screen.getByDisplayValue("grants-overview")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing description")).toBeInTheDocument();
  });

  // Renaming a published page changes its public URL, so the slug must never
  // silently follow the name on an existing page.
  it("never re-derives the slug from the name when editing", async () => {
    mockDetail.mockReturnValue({ data: existingConfig(), isLoading: false, isError: false });

    render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), " renamed");

    expect(screen.getByDisplayValue("grants-overview")).toBeInTheDocument();
  });

  it("updates through the original slug so a rename can be applied", async () => {
    mockDetail.mockReturnValue({ data: existingConfig(), isLoading: false, isError: false });

    render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    expect(updateMutate.mock.calls[0][0]).toMatchObject({ slug: "grants-overview" });
  });

  it("reports a page it could not load instead of offering a blank form", () => {
    mockDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );

    expect(screen.getByText(/Could not load this page/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
  });
});

describe("NotebookBuilderEditorPage — preview", () => {
  // Reusing the public renderer is the point: a bespoke preview would be a
  // second implementation to keep in step, and the first time it drifted an
  // author would publish something they had not actually seen.
  it("previews with the community's real figures through the public renderer", () => {
    mockDetail.mockReturnValue({ data: existingConfig(), isLoading: false, isError: false });

    render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );

    expect(screen.getByText("$9.25M")).toBeInTheDocument();
    expect(screen.getByText("$6.37M")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
  });

  it("shows author free text as text, never as markup", () => {
    mockDetail.mockReturnValue({
      data: existingConfig({
        spec: {
          version: 1,
          sections: [
            {
              type: "bars",
              source: "programs",
              metric: "disbursedVsCommitted",
              title: '<img src=x onerror="alert(1)">',
            },
          ],
        },
      } as Partial<NotebookConfig>),
      isLoading: false,
      isError: false,
    });

    const { container } = render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );

    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.getAllByText('<img src=x onerror="alert(1)">').length).toBeGreaterThan(0);
  });
});
