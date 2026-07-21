import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FastReportEvent } from "@/types/donor-research";
import { ProgressTimeline } from "../ProgressTimeline";

const makeEvent = (
  name: FastReportEvent["name"],
  data: Record<string, unknown> = {}
): FastReportEvent => ({
  name,
  reportId: "report-1",
  data,
});

describe("ProgressTimeline completed-stage detail lines", () => {
  it("should_show_candidate_pool_count_after_pool_loaded_completes", () => {
    render(
      <ProgressTimeline
        events={[makeEvent("snapshot"), makeEvent("pool_loaded", { count: 12 })]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("12 candidates identified")).toBeInTheDocument();
  });

  it("should_singularize_a_pool_count_of_one", () => {
    render(
      <ProgressTimeline
        events={[makeEvent("snapshot"), makeEvent("pool_loaded", { count: 1 })]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("1 candidate identified")).toBeInTheDocument();
  });

  it("should_render_zero_candidates_identified_on_the_empty_pool_short_circuit", () => {
    render(
      <ProgressTimeline
        events={[makeEvent("snapshot"), makeEvent("pool_loaded", { count: 0 })]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("0 candidates identified")).toBeInTheDocument();
  });

  it("should_show_passed_and_disqualified_counts_after_compliance_completes", () => {
    render(
      <ProgressTimeline
        events={[
          makeEvent("snapshot"),
          makeEvent("pool_loaded", { count: 12 }),
          makeEvent("compliance_complete", { scoredCount: 10, disqualifiedCount: 2 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("10 passed · 2 disqualified")).toBeInTheDocument();
  });

  it("should_hide_the_disqualified_segment_when_none_were_disqualified", () => {
    render(
      <ProgressTimeline
        events={[
          makeEvent("snapshot"),
          makeEvent("pool_loaded", { count: 12 }),
          makeEvent("compliance_complete", { scoredCount: 10, disqualifiedCount: 0 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("10 passed")).toBeInTheDocument();
    expect(screen.queryByText(/disqualified/)).not.toBeInTheDocument();
  });

  it("should_show_researched_and_known_counts_after_contact_discovery_completes", () => {
    render(
      <ProgressTimeline
        events={[
          makeEvent("snapshot"),
          makeEvent("pool_loaded", { count: 12 }),
          makeEvent("compliance_complete", { scoredCount: 10, disqualifiedCount: 2 }),
          makeEvent("contact_discovery_complete", { discovered: 8, cached: 4, failed: 0 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("8 researched · 4 already known")).toBeInTheDocument();
  });

  it("should_append_a_failed_segment_when_some_discoveries_failed", () => {
    render(
      <ProgressTimeline
        events={[
          makeEvent("snapshot"),
          makeEvent("pool_loaded", { count: 12 }),
          makeEvent("compliance_complete", { scoredCount: 10, disqualifiedCount: 2 }),
          makeEvent("contact_discovery_complete", { discovered: 8, cached: 4, failed: 2 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("8 researched · 4 already known · 2 failed")).toBeInTheDocument();
  });

  it("should_show_ranked_count_after_ranking_completes", () => {
    render(
      <ProgressTimeline
        events={[
          makeEvent("snapshot"),
          makeEvent("pool_loaded", { count: 12 }),
          makeEvent("compliance_complete", { scoredCount: 10, disqualifiedCount: 2 }),
          makeEvent("contact_discovery_complete", { discovered: 8, cached: 4, failed: 0 }),
          makeEvent("activity_complete", {}),
          makeEvent("ranking_complete", { rankedCount: 12 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("12 candidates ranked")).toBeInTheDocument();
  });

  it("should_singularize_a_ranked_count_of_one", () => {
    render(
      <ProgressTimeline
        events={[
          makeEvent("snapshot"),
          makeEvent("pool_loaded", { count: 1 }),
          makeEvent("compliance_complete", { scoredCount: 1, disqualifiedCount: 0 }),
          makeEvent("contact_discovery_complete", { discovered: 1, cached: 0, failed: 0 }),
          makeEvent("activity_complete", {}),
          makeEvent("ranking_complete", { rankedCount: 1 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("1 candidate ranked")).toBeInTheDocument();
  });

  it("should_show_a_signals_sampled_summary_when_activity_tallies_are_present", () => {
    render(
      <ProgressTimeline
        events={[
          makeEvent("snapshot"),
          makeEvent("pool_loaded", { count: 12 }),
          makeEvent("compliance_complete", { scoredCount: 10, disqualifiedCount: 2 }),
          makeEvent("contact_discovery_complete", { discovered: 8, cached: 4, failed: 0 }),
          makeEvent("activity_complete", {
            okCount: 5,
            partialCount: 2,
            failedCount: 1,
            noSignalCount: 2,
          }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("10 signals sampled")).toBeInTheDocument();
  });

  it("should_fall_back_to_the_static_caption_when_expected_fields_are_missing", () => {
    const { container } = render(
      <ProgressTimeline
        events={[makeEvent("snapshot"), makeEvent("pool_loaded", {})]}
        latest={null}
        errorCount={0}
      />
    );

    // No detail line for the malformed pool_loaded event...
    expect(screen.queryByText(/candidates? identified/)).not.toBeInTheDocument();
    // ...and the next stage's own static caption still renders normally
    // (proves the malformed event didn't wedge the rest of the timeline).
    expect(screen.getByText("Running Pub 78, recent 990, and CA AG checks.")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/undefined/i);
    expect(container).not.toHaveTextContent(/NaN/i);
  });

  it("should_fall_back_to_the_static_caption_when_activity_tallies_are_missing", () => {
    const { container } = render(
      <ProgressTimeline
        events={[
          makeEvent("snapshot"),
          makeEvent("pool_loaded", { count: 12 }),
          makeEvent("compliance_complete", { scoredCount: 10, disqualifiedCount: 2 }),
          makeEvent("contact_discovery_complete", { discovered: 8, cached: 4, failed: 0 }),
          makeEvent("activity_complete", {}),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.queryByText(/signals sampled/)).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/undefined/i);
    expect(container).not.toHaveTextContent(/NaN/i);
  });

  it("should_leave_stage_completion_and_active_labeling_unchanged", () => {
    render(
      <ProgressTimeline
        events={[makeEvent("snapshot"), makeEvent("pool_loaded", { count: 12 })]}
        latest={null}
        errorCount={0}
      />
    );

    // Active stage becomes "Compliance verdict" — unaffected by the new detail
    // lines. The header AND the step label both render the stage name.
    expect(screen.getAllByText("Compliance verdict")).toHaveLength(2);
    expect(screen.getByText("Running Pub 78, recent 990, and CA AG checks.")).toBeInTheDocument();
  });
});

describe("ProgressTimeline live contact-discovery progress caption", () => {
  const eventsThroughCompliance: FastReportEvent[] = [
    makeEvent("snapshot"),
    makeEvent("pool_loaded", { count: 12 }),
    makeEvent("compliance_complete", { scoredCount: 10, disqualifiedCount: 2 }),
  ];

  it("should_show_the_candidate_currently_being_worked_mid_stage", () => {
    render(
      <ProgressTimeline
        events={[
          ...eventsThroughCompliance,
          makeEvent("contact_discovery_progress", { done: 3, total: 12 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("Researching 4 of 12 candidates…")).toBeInTheDocument();
  });

  it("should_clamp_the_current_candidate_to_the_total_when_the_last_one_is_in_flight", () => {
    render(
      <ProgressTimeline
        events={[
          ...eventsThroughCompliance,
          makeEvent("contact_discovery_progress", { done: 12, total: 12 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("Researching 12 of 12 candidates…")).toBeInTheDocument();
  });

  it("should_singularize_a_total_of_one_candidate", () => {
    render(
      <ProgressTimeline
        events={[
          ...eventsThroughCompliance,
          makeEvent("contact_discovery_progress", { done: 0, total: 1 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.getByText("Researching 1 of 1 candidate…")).toBeInTheDocument();
  });

  it("should_keep_the_static_caption_when_no_progress_event_exists", () => {
    render(<ProgressTimeline events={eventsThroughCompliance} latest={null} errorCount={0} />);

    expect(
      screen.getByText(
        "Searching the web for each candidate's official website and social handles (~30 seconds per organization)."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Researching/)).not.toBeInTheDocument();
  });

  it("should_keep_the_static_caption_when_the_progress_payload_is_malformed", () => {
    render(
      <ProgressTimeline
        events={[...eventsThroughCompliance, makeEvent("contact_discovery_progress", {})]}
        latest={null}
        errorCount={0}
      />
    );

    expect(
      screen.getByText(
        "Searching the web for each candidate's official website and social handles (~30 seconds per organization)."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Researching/)).not.toBeInTheDocument();
  });

  it("should_replace_the_live_counter_with_the_completed_summary_once_contact_discovery_completes", () => {
    render(
      <ProgressTimeline
        events={[
          ...eventsThroughCompliance,
          makeEvent("contact_discovery_progress", { done: 12, total: 12 }),
          makeEvent("contact_discovery_complete", { discovered: 8, cached: 4, failed: 0 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    expect(screen.queryByText(/Researching/)).not.toBeInTheDocument();
    expect(screen.getByText("8 researched · 4 already known")).toBeInTheDocument();
  });

  it("should_not_advance_activeIndex_when_only_a_progress_event_is_present", () => {
    render(
      <ProgressTimeline
        events={[
          ...eventsThroughCompliance,
          makeEvent("contact_discovery_progress", { done: 3, total: 12 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    // Contact discovery remains the active stage — progress events don't
    // count toward `seenNames`/`activeIndex` since they aren't in STAGE_ORDER.
    expect(screen.getAllByText("Contact discovery")).toHaveLength(2);
  });
});

describe("ProgressTimeline connector line geometry", () => {
  it("should_render_one_connector_per_stage_except_the_last_so_the_line_never_extends_past_the_final_dot", () => {
    const { container } = render(
      <ProgressTimeline
        events={[makeEvent("snapshot"), makeEvent("pool_loaded", { count: 3 })]}
        latest={null}
        errorCount={0}
      />
    );

    const items = container.querySelectorAll("ol > li");
    const connectors = container.querySelectorAll("[data-connector]");
    expect(connectors).toHaveLength(items.length - 1);
    expect(items[items.length - 1]?.querySelector("[data-connector]")).toBeNull();
  });

  it("should_mark_connectors_of_completed_stages_as_traveled_and_the_rest_pending", () => {
    const { container } = render(
      <ProgressTimeline
        events={[
          makeEvent("snapshot"),
          makeEvent("pool_loaded", { count: 3 }),
          makeEvent("compliance_complete", { disqualifiedCount: 0, scoredCount: 3 }),
        ]}
        latest={null}
        errorCount={0}
      />
    );

    const traveled = container.querySelectorAll('[data-connector="traveled"]');
    const pending = container.querySelectorAll('[data-connector="pending"]');
    expect(traveled).toHaveLength(3);
    expect(pending).toHaveLength(3);
  });
});

describe("ProgressTimeline synthesis progress", () => {
  const eventsThroughRanking: FastReportEvent[] = [
    makeEvent("snapshot"),
    makeEvent("pool_loaded", { count: 25 }),
    makeEvent("compliance_complete", { scoredCount: 25, disqualifiedCount: 0 }),
    makeEvent("contact_discovery_complete", { discovered: 0, cached: 25, failed: 0 }),
    makeEvent("activity_complete", {
      okCount: 25,
      partialCount: 0,
      failedCount: 0,
      noSignalCount: 0,
    }),
    makeEvent("ranking_complete", { rankedCount: 25 }),
  ];

  it("should_translate_synthesis_started_into_the_final_writing_phase", () => {
    const synthesis = makeEvent("synthesis_started", { candidateCount: 25 });
    render(
      <ProgressTimeline
        errorCount={0}
        events={[...eventsThroughRanking, synthesis]}
        latest={synthesis}
      />
    );

    expect(screen.getAllByText("Report synthesis")).toHaveLength(2);
    expect(screen.getAllByText("Writing summaries for 25 candidates…")).toHaveLength(2);
  });

  it("should_mark_the_synthesis_stage_ready_when_the_report_finalizes", () => {
    render(
      <ProgressTimeline
        errorCount={0}
        events={[
          ...eventsThroughRanking,
          makeEvent("synthesis_started", { candidateCount: 25 }),
          makeEvent("report_finalized"),
        ]}
        latest={makeEvent("report_finalized")}
      />
    );

    expect(screen.getByText("All stages complete")).toBeInTheDocument();
    expect(screen.getByText("Report ready")).toBeInTheDocument();
  });

  it("should_announce_candidate_details_instead_of_the_raw_event_name", () => {
    const candidateUpdate = makeEvent("candidate_stage_complete", {
      fundingOrganizationId: "org-1",
      stage: "news",
      status: "ok",
      detail: "3 recent mentions found",
    });
    render(
      <ProgressTimeline events={eventsThroughRanking} latest={candidateUpdate} errorCount={0} />
    );

    expect(screen.getByText("Candidate update: 3 recent mentions found")).toBeInTheDocument();
  });
});
