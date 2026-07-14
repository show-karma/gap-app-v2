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
