import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DescribePagePanel } from "@/components/Pages/Admin/Notebooks/DescribePagePanel";
import { AiDraftNotice } from "@/components/Pages/Admin/Notebooks/SectionProvenance";
import { attachProvenance } from "@/services/notebooks/notebook-generation.types";

const generateNotebookSpec = vi.fn();
vi.mock("@/services/notebooks-admin.service", () => ({
  generateNotebookSpec: (slug: string, prompt: string) => generateNotebookSpec(slug, prompt),
}));

/**
 * The describe-your-page entry, and the promises it has to keep.
 *
 * The valuable tests here are the NEGATIVE ones. Anyone can check that a
 * prompt reaches the generator; what matters is that a generated page cannot
 * skip review — it is not saved, not published, and it never silently
 * replaces work an author already did.
 */

const RESULT = {
  spec: { version: 1, sections: [{ type: "applications" }] },
  provenance: [
    {
      sectionIndex: 0,
      summary: "Application counts for this community.",
      sources: [{ kind: "funding", id: "applications", label: "Applications" }],
    },
  ],
  warnings: ["No timeseries indicator matched 'adoption', so that section was left out."],
};

function renderPanel(hasExistingSections = false) {
  const onGenerated = vi.fn();
  render(
    <DescribePagePanel
      communitySlug="filecoin"
      hasExistingSections={hasExistingSections}
      onGenerated={onGenerated}
    />
  );
  return onGenerated;
}

async function describePage(text = "a kernel health page") {
  await userEvent.type(screen.getByRole("textbox"), text);
}

describe("DescribePagePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateNotebookSpec.mockResolvedValue(RESULT);
  });

  it("should_not_offer_to_compose_an_empty_description", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: /compose a draft/i })).toBeDisabled();
  });

  it("should_hand_the_composer_the_spec_its_provenance_and_its_warnings", async () => {
    const onGenerated = renderPanel();
    await describePage();

    await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));

    await waitFor(() => expect(onGenerated).toHaveBeenCalledTimes(1));
    expect(onGenerated).toHaveBeenCalledWith({
      spec: RESULT.spec,
      provenance: attachProvenance(1, RESULT.provenance as never),
      // Surfaced, not swallowed: what the generator could not do is exactly
      // what a reviewer needs told.
      warnings: RESULT.warnings,
    });
  });

  describe("replacing existing work", () => {
    // Silently discarding an author's page is unforgivable, and merging two
    // page structures is a guess. So: replace, but only ever on purpose.
    it("should_ask_before_replacing_sections_the_author_already_has", async () => {
      renderPanel(true);
      await describePage();

      await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));

      expect(screen.getByText(/generating replaces all of them/i)).toBeInTheDocument();
      expect(generateNotebookSpec).not.toHaveBeenCalled();
    });

    it("should_generate_once_the_author_confirms", async () => {
      renderPanel(true);
      await describePage();
      await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));

      await userEvent.click(screen.getByRole("button", { name: /replace my sections/i }));

      await waitFor(() => expect(generateNotebookSpec).toHaveBeenCalledTimes(1));
    });

    it("should_leave_the_page_untouched_when_the_author_declines", async () => {
      const onGenerated = renderPanel(true);
      await describePage();
      await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));

      await userEvent.click(screen.getByRole("button", { name: /keep what i have/i }));

      expect(generateNotebookSpec).not.toHaveBeenCalled();
      expect(onGenerated).not.toHaveBeenCalled();
    });

    it("should_not_ask_when_there_is_nothing_to_lose", async () => {
      renderPanel(false);
      await describePage();

      await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));

      await waitFor(() => expect(generateNotebookSpec).toHaveBeenCalledTimes(1));
    });
  });

  /**
   * FAILURES, SHAPED AS THE API CLIENT ACTUALLY THROWS THEM.
   *
   * The client throws an HttpError whose `message` is
   * "HTTP 502 POST /v2/communities/0xf11e…/notebook-configs/generate" and
   * whose `body` holds the sentence written for a person. An earlier version
   * of these tests rejected with a friendly `new Error(...)`, which no real
   * call produces — and the panel duly rendered the internal path to admins.
   * These fixtures are copied from the live endpoint.
   */
  describe("failures", () => {
    const httpError = (status: number, message?: string) =>
      Object.assign(
        new Error(`HTTP ${status} POST /v2/communities/0xf11ec01a/notebook-configs/generate`),
        { status, body: message ? { error: "Bad Gateway", message } : undefined }
      );

    it("should_show_the_servers_explanation_not_the_raw_http_error", async () => {
      generateNotebookSpec.mockRejectedValue(
        httpError(502, "Notebook generation did not produce a valid specification after 2 attempts")
      );
      renderPanel();
      await describePage();

      await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/did not produce a valid specification/i);
      // The internal path must never reach a reviewer's screen.
      expect(alert).not.toHaveTextContent(/HTTP 502/);
      expect(alert).not.toHaveTextContent(/v2\/communities/);
    });

    // Different remedy, different message: ask for access, not try again.
    it.each([401, 403])("should_say_it_is_a_permission_problem_on_%s", async (status) => {
      generateNotebookSpec.mockRejectedValue(httpError(status, "Forbidden"));
      renderPanel();
      await describePage();

      await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/do not have permission/i);
    });

    it("should_fall_back_to_a_plain_sentence_when_the_server_explains_nothing", async () => {
      generateNotebookSpec.mockRejectedValue(httpError(500));
      renderPanel();
      await describePage();

      await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/could not be generated/i);
      expect(alert).not.toHaveTextContent(/HTTP 500/);
    });

    it("should_hand_the_composer_nothing_when_generation_fails", async () => {
      generateNotebookSpec.mockRejectedValue(httpError(502, "nope"));
      const onGenerated = renderPanel();
      await describePage();

      await userEvent.click(screen.getByRole("button", { name: /compose a draft/i }));

      await screen.findByRole("alert");
      expect(onGenerated).not.toHaveBeenCalled();
    });
  });

  /**
   * THE STRUCTURAL PROMISE. Draft-only is not a rule this component obeys, it
   * is a thing it cannot do: it holds no save or publish mutation, so there is
   * no code path from generating to persisting. A test that only checked the
   * button labels would pass on a component that quietly saved.
   */
  it("should_offer_no_way_to_save_or_publish_from_here", async () => {
    renderPanel();
    await describePage();

    expect(screen.queryByRole("button", { name: /publish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("should_say_that_nothing_is_saved_or_published_until_the_author_says_so", () => {
    renderPanel();

    expect(screen.getByText(/nothing is saved or published until you say so/i)).toBeInTheDocument();
  });
});

/**
 * Provenance has to survive the reordering a reviewer does.
 *
 * A bare index goes stale the moment a section moves, and stale provenance is
 * worse than none: it attributes one section's sources to another, which is
 * precisely the mistake a reviewer is there to catch.
 */
describe("attachProvenance", () => {
  const entry = (sectionIndex: number, label: string) => ({
    sectionIndex,
    summary: `s${sectionIndex}`,
    sources: [{ kind: "metric" as const, label }],
  });

  it("should_bind_each_entry_to_the_section_it_names", () => {
    const bound = attachProvenance(3, [entry(2, "c"), entry(0, "a")]);

    expect(bound.map((e) => e?.sources[0].label)).toEqual(["a", undefined, "c"]);
  });

  // Evidence the reviewer cannot see is evidence that does not exist.
  it("should_place_an_unkeyed_entry_rather_than_dropping_it", () => {
    const bound = attachProvenance(2, [
      { summary: "no key", sources: [{ kind: "authored" as const, label: "prose" }] },
    ]);

    expect(bound[0]?.sources[0].label).toBe("prose");
  });

  it("should_ignore_an_index_past_the_end_rather_than_growing_the_array", () => {
    const bound = attachProvenance(1, [entry(9, "far")]);

    expect(bound).toHaveLength(1);
    // Not dropped either — it falls into the free slot.
    expect(bound[0]?.sources[0].label).toBe("far");
  });

  it("should_return_one_slot_per_section_even_with_no_provenance_at_all", () => {
    expect(attachProvenance(3, [])).toEqual([undefined, undefined, undefined]);
  });
});

/**
 * The two claims in the AI notice, and why they cannot share a lifetime.
 *
 * The bundled version cleared everything on save, which quietly asserted that
 * saving a draft means somebody checked the figures. It does not. Publishing
 * is the moment a human puts their community's name to the numbers, and the
 * indexer encodes that by clearing `source` to `manual` on publish.
 */
describe("AiDraftNotice", () => {
  it("should_say_nothing_is_saved_while_the_proposal_is_still_in_the_browser", () => {
    render(<AiDraftNotice unsaved warnings={[]} />);

    expect(
      screen.getByText(/not saved, not published, figures not yet verified/i)
    ).toBeInTheDocument();
  });

  // The case the bundled notice got wrong: saved yesterday, reopened today,
  // still nobody has vouched for it.
  it("should_still_flag_an_unverified_page_once_it_has_been_saved", () => {
    render(<AiDraftNotice unsaved={false} warnings={[]} />);

    const notice = screen.getByText(/proposed by ai/i);
    expect(notice).toHaveTextContent(/figures not yet verified/i);
    expect(notice).not.toHaveTextContent(/not saved/i);
  });

  it("should_name_publishing_as_the_act_of_vouching", () => {
    render(<AiDraftNotice unsaved={false} warnings={[]} />);

    expect(screen.getByText(/publishing is how you vouch/i)).toBeInTheDocument();
  });

  it("should_list_the_generators_warnings_rather_than_swallowing_them", () => {
    render(<AiDraftNotice unsaved warnings={["No indicator matched 'adoption'."]} />);

    expect(screen.getByText(/no indicator matched 'adoption'/i)).toBeInTheDocument();
  });
});
