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

/**
 * Partial mock: only the network call is replaced.
 *
 * `sanitizeSlugInput` and `slugifyNotebookName` are pure helpers the editor
 * relies on, and stubbing them would test a different component than the one
 * that ships.
 */
const generateNotebookSpec = vi.fn();
vi.mock("@/services/notebooks-admin.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/notebooks-admin.service")>()),
  generateNotebookSpec: (slug: string, prompt: string) => generateNotebookSpec(slug, prompt),
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
  generateNotebookSpec.mockResolvedValue({
    spec: { version: 1, sections: [{ type: "applications" }] },
    provenance: [],
    warnings: [],
  });
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

/**
 * F7 — a broken page must be repairable in place.
 *
 * The list told admins to fix the page; the editor answered "Could not load
 * this page" for exactly that row, because it parsed with the public schema
 * where `spec` cannot be null. Fail-closed was visible but not recoverable.
 */
describe("NotebookBuilderEditorPage — recovering a broken page", () => {
  const brokenConfig = () =>
    existingConfig({
      spec: null,
      specError: "The stored page layout could not be read by this version.",
    } as unknown as Partial<NotebookConfig>);

  it("opens the page instead of refusing to load it", () => {
    mockDetail.mockReturnValue({ data: brokenConfig(), isLoading: false, isError: false });

    render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );

    expect(screen.queryByText(/Could not load this page/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeInTheDocument();
  });

  // The identity is intact and unchanged — only the layout is rebuilt.
  it("keeps the page's name, URL and description", () => {
    mockDetail.mockReturnValue({ data: brokenConfig(), isLoading: false, isError: false });

    render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );

    expect(screen.getByDisplayValue("Grants overview")).toBeInTheDocument();
    expect(screen.getByDisplayValue("grants-overview")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing description")).toBeInTheDocument();
  });

  // The layout on screen is NOT the stored one, and saving replaces rather
  // than edits it. An author who is not told that would think they were
  // looking at their page.
  it("says the layout was cleared and what saving will do", () => {
    mockDetail.mockReturnValue({ data: brokenConfig(), isLoading: false, isError: false });

    render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );

    expect(screen.getByText(/could not be read, so it has been cleared/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Rebuild notebook page/i })).toBeInTheDocument();
  });

  it("saves the rebuilt layout through the normal update path", async () => {
    mockDetail.mockReturnValue({ data: brokenConfig(), isLoading: false, isError: false });

    render(
      <NotebookBuilderEditorPage community={community} slug="grants-overview" overview={overview} />
    );
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    expect(updateMutate.mock.calls[0][0].body.spec).toBeDefined();
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

/**
 * The AI origin has to SURVIVE THE WRITE, and only the write can prove it.
 *
 * The earlier version of this guarantee was tested by seeding
 * `existing.source = "ai"` and checking the notice appeared. That test passed
 * for months while the write path never sent `source` at all — so an AI draft
 * saved and reopened came back as `manual` and the warning silently vanished,
 * which is precisely what the notice exists to prevent.
 *
 * The lesson is the one this project keeps relearning: ASSERT WHAT CROSSED THE
 * BOUNDARY, not what the mock handed back. A mock that answers `source: "ai"`
 * regardless is more cooperative than the server, and a suite built on it is
 * green while the wire is broken. So every assertion below reads the BODY the
 * mutation was called with.
 */
describe("NotebookBuilderEditorPage — the AI origin crosses the write boundary", () => {
  const savedBody = (mutate: typeof createMutate) => mutate.mock.calls[0][0];

  async function generateThenSave() {
    render(<NotebookBuilderEditorPage community={community} overview={overview} />);
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "AI page");

    // Drive the real entry rather than poking state: the bug lived in the
    // handoff between generating and saving, so the test has to cross it.
    await userEvent.type(
      screen.getByRole("textbox", { name: /describe the page/i }),
      "a kernel page"
    );
    await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));
    // A brand-new page is seeded with one KPI section, so the replace-confirm
    // appears even here. Going through it is what an author actually does.
    await userEvent.click(screen.getByRole("button", { name: /replace my sections/i }));
    // Wait on the CALL, not on copy: the notice's wording is not what this
    // test is about, and coupling to it makes a copy edit look like a bug.
    await waitFor(() => expect(generateNotebookSpec).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(createMutate).toHaveBeenCalled());
  }

  it("should_send_source_ai_when_saving_a_generated_draft", async () => {
    await generateThenSave();

    expect(savedBody(createMutate).source).toBe("ai");
  });

  // The bug in miniature: setProposed(null) runs before the body is built, so
  // reading the flag afterwards reports `manual` for a draft that was AI-made.
  it("should_capture_the_origin_before_clearing_the_unsaved_flag", async () => {
    await generateThenSave();

    expect(savedBody(createMutate)).toMatchObject({ source: "ai", name: "AI page" });
  });

  it("should_send_source_manual_for_a_page_the_author_composed_themselves", async () => {
    render(<NotebookBuilderEditorPage community={community} overview={overview} />);
    await userEvent.type(screen.getByRole("textbox", { name: /name/i }), "Hand made");

    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalled());
    expect(savedBody(createMutate).source).toBe("manual");
  });

  describe("editing a stored AI draft", () => {
    beforeEach(() => {
      mockDetail.mockReturnValue({
        data: existingConfig({ source: "ai" } as Partial<NotebookConfig>),
        isLoading: false,
        isError: false,
      });
    });

    // An author tweaking an AI draft has still not vouched for it. The origin
    // must survive an ordinary edit, or the warning disappears on the second
    // save rather than the first.
    it("should_preserve_source_ai_across_an_ordinary_draft_edit", async () => {
      render(
        <NotebookBuilderEditorPage
          community={community}
          slug="grants-overview"
          overview={overview}
        />
      );
      await waitFor(() => expect(screen.getByDisplayValue("Grants overview")).toBeInTheDocument());

      await userEvent.click(screen.getByRole("button", { name: /save draft/i }));

      await waitFor(() => expect(updateMutate).toHaveBeenCalled());
      expect(updateMutate.mock.calls[0][0].body.source).toBe("ai");
    });

    // No publish special case in the body: the indexer clears source on
    // publish, so sending "ai" alongside a publish is honest about what the
    // draft was and harmless to what the row becomes.
    it("should_still_report_the_origin_when_publishing_and_let_the_server_clear_it", async () => {
      render(
        <NotebookBuilderEditorPage
          community={community}
          slug="grants-overview"
          overview={overview}
        />
      );
      await waitFor(() => expect(screen.getByDisplayValue("Grants overview")).toBeInTheDocument());

      await userEvent.click(screen.getByRole("button", { name: /publish/i }));

      await waitFor(() => expect(updateMutate).toHaveBeenCalled());
      expect(updateMutate.mock.calls[0][0].body).toMatchObject({
        source: "ai",
        status: "published",
      });
    });
  });
});
