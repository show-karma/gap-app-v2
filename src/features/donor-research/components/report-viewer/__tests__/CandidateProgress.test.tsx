import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CandidateEnrichmentStage, FastReportEvent } from "@/types/donor-research";
import { CandidateProgress } from "../CandidateProgress";

function event(name: FastReportEvent["name"], data: Record<string, unknown>): FastReportEvent {
  return { name, reportId: "report-1", data };
}

const identified = event("candidates_identified", {
  count: 2,
  candidates: [
    {
      fundingOrganizationId: "org-1",
      name: "Hope Shelter",
      city: "Austin",
      state: "TX",
    },
    {
      fundingOrganizationId: "org-2",
      name: "River Trust",
      city: null,
      state: "OR",
    },
  ],
});

function stageEvent(
  fundingOrganizationId: string,
  stage: CandidateEnrichmentStage,
  detail: string,
  extras: Record<string, unknown> = {}
): FastReportEvent {
  return event("candidate_stage_complete", {
    fundingOrganizationId,
    stage,
    status: "ok",
    detail,
    ...extras,
  });
}

describe("CandidateProgress", () => {
  it("should_show_skeleton_rows_until_candidates_are_identified", () => {
    const { container } = render(<CandidateProgress events={[]} />);

    expect(container.querySelectorAll(".animate-dashv3-pulse").length).toBeGreaterThan(0);
  });

  it("should_render_identified_organizations_and_pending_stage_cells", () => {
    render(<CandidateProgress events={[identified]} />);

    expect(screen.getByText("2 candidates identified")).toBeInTheDocument();
    expect(screen.getByText("Hope Shelter")).toBeInTheDocument();
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("River Trust")).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(screen.getAllByText("Waiting")).toHaveLength(8);
    expect(screen.getByText("Research underway")).toBeInTheDocument();
  });

  it("should_render_each_stage_detail_and_count_a_fully_settled_candidate", () => {
    render(
      <CandidateProgress
        events={[
          identified,
          stageEvent("org-1", "compliance", "Nonprofit status verified", {
            verdict: "verified",
          }),
          stageEvent("org-1", "contacts", "Found website and LinkedIn"),
          stageEvent("org-1", "news", "3 recent mentions found"),
          stageEvent("org-1", "social", "Socials updated · last post yesterday"),
        ]}
      />
    );

    const stages = screen.getByRole("list", { name: "Research stages for Hope Shelter" });
    expect(within(stages).getByText("Nonprofit status verified")).toBeInTheDocument();
    expect(within(stages).getByText("Found website and LinkedIn")).toBeInTheDocument();
    expect(within(stages).getByText("3 recent mentions found")).toBeInTheDocument();
    expect(within(stages).getByText("Socials updated · last post yesterday")).toBeInTheDocument();
    expect(screen.getByText("1 / 2 reviewed")).toBeInTheDocument();
  });

  it("should_resolve_unrun_stages_when_compliance_disqualifies_a_candidate", () => {
    const oneCandidate = event("candidates_identified", {
      count: 1,
      candidates: [
        {
          fundingOrganizationId: "org-1",
          name: "Hope Shelter",
          city: "Austin",
          state: "TX",
        },
      ],
    });

    render(
      <CandidateProgress
        events={[
          oneCandidate,
          stageEvent("org-1", "compliance", "Removed by compliance screening", {
            verdict: "disqualified",
          }),
        ]}
      />
    );

    expect(screen.getByText("1 candidate identified")).toBeInTheDocument();
    expect(screen.getByText("Removed by compliance screening")).toBeInTheDocument();
    expect(screen.getAllByText("Not run after screening")).toHaveLength(3);
    expect(screen.getByText("1 / 1 reviewed")).toBeInTheDocument();
    expect(screen.queryByText("Waiting")).not.toBeInTheDocument();
  });

  it("should_render_failed_and_skipped_details_without_treating_them_as_pending", () => {
    render(
      <CandidateProgress
        events={[
          identified,
          event("candidate_stage_complete", {
            fundingOrganizationId: "org-1",
            stage: "news",
            status: "failed",
            detail: "News lookup failed",
          }),
          event("candidate_stage_complete", {
            fundingOrganizationId: "org-1",
            stage: "social",
            status: "skipped",
            detail: "Social signal unavailable",
          }),
        ]}
      />
    );

    expect(screen.getByText("News lookup failed")).toBeInTheDocument();
    expect(screen.getByText("Social signal unavailable")).toBeInTheDocument();
  });

  it("should_show_a_clear_empty_result_when_the_identified_list_is_empty", () => {
    render(
      <CandidateProgress events={[event("candidates_identified", { count: 0, candidates: [] })]} />
    );

    expect(screen.getByText("No matching candidates were identified.")).toBeInTheDocument();
    expect(screen.queryByText(/0 candidates/i)).not.toBeInTheDocument();
  });
});
