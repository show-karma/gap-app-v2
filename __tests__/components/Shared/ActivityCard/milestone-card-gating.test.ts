import { describe, expect, it } from "vitest";
import { computeMilestoneCardCompletionGate } from "@/components/Shared/ActivityCard/milestone-card-gating";

const baseInput = {
  type: "grant" as const,
  completed: false,
  completionReason: undefined,
  completionProof: undefined,
  completionDeliverables: undefined,
  isCompleting: false,
  isEditing: false,
};

describe("computeMilestoneCardCompletionGate", () => {
  describe("completed milestone-shaped entry without narrative", () => {
    // The reason this branch exists: evermedia-vault shipped grant
    // milestones marked completed on-chain with no narrative. After the
    // indexer fix, completionReason arrives empty — but the timeline
    // should still surface the completion event so MilestoneCard can
    // render "—" inside renderMilestoneCompletion.
    it("should_show_section_for_completed_grant_with_empty_narrative", () => {
      const gate = computeMilestoneCardCompletionGate({
        ...baseInput,
        type: "grant",
        completed: true,
      });

      expect(gate.showSection).toBe(true);
      expect(gate.showTimelineHeader).toBe(true);
    });

    it("should_show_section_for_completed_project_milestone_with_empty_narrative", () => {
      const gate = computeMilestoneCardCompletionGate({
        ...baseInput,
        type: "milestone",
        completed: true,
      });

      expect(gate.showSection).toBe(true);
      expect(gate.showTimelineHeader).toBe(true);
    });

    it("should_show_section_for_completed_project_objective_with_empty_narrative", () => {
      const gate = computeMilestoneCardCompletionGate({
        ...baseInput,
        type: "project",
        completed: true,
      });

      expect(gate.showSection).toBe(true);
      expect(gate.showTimelineHeader).toBe(true);
    });

    it("should_treat_object_form_completed_as_truthy", () => {
      // V1 milestone shape carries `completed` as a metadata object, not
      // a boolean. Both must trigger the same gate decision.
      const gate = computeMilestoneCardCompletionGate({
        ...baseInput,
        type: "grant",
        completed: { createdAt: "2024-01-01", data: { reason: "" } },
      });

      expect(gate.showSection).toBe(true);
      expect(gate.showTimelineHeader).toBe(true);
    });
  });

  describe("non-milestone activity types fall back to content gate", () => {
    // Updates / grant_updates / activities don't have a "completion"
    // semantic — without explicit content there's nothing to render and
    // the section should stay hidden.
    it.each(["update", "grant_update", "activity", "impact"] as const)(
      "should_hide_section_for_%s_with_no_content",
      (type) => {
        const gate = computeMilestoneCardCompletionGate({
          ...baseInput,
          type,
          completed: true,
        });

        expect(gate.showSection).toBe(false);
        expect(gate.showTimelineHeader).toBe(false);
      }
    );

    it("should_show_section_for_grant_update_when_completionReason_present", () => {
      const gate = computeMilestoneCardCompletionGate({
        ...baseInput,
        type: "grant_update",
        completionReason: "Quarterly report",
      });

      expect(gate.showSection).toBe(true);
      expect(gate.showTimelineHeader).toBe(true);
    });
  });

  describe("form-input flow suppresses the timeline header", () => {
    // While the user is filling in the completion form we render the
    // form inside the section but want to hide the "Posted by" header
    // since the data isn't committed yet.
    it("should_show_section_but_hide_header_when_isCompleting", () => {
      const gate = computeMilestoneCardCompletionGate({
        ...baseInput,
        type: "milestone",
        isCompleting: true,
      });

      expect(gate.showSection).toBe(true);
      expect(gate.showTimelineHeader).toBe(false);
    });

    it("should_show_section_and_header_when_isEditing", () => {
      // Editing differs from creating — there's already a committed
      // completion behind the form, so the header (Posted X by Y) is
      // still meaningful.
      const gate = computeMilestoneCardCompletionGate({
        ...baseInput,
        type: "grant",
        completed: true,
        isEditing: true,
      });

      expect(gate.showSection).toBe(true);
      expect(gate.showTimelineHeader).toBe(true);
    });
  });

  describe("legacy content-only gate (pre-completion-flag entries)", () => {
    it("should_show_section_when_only_completionProof_present", () => {
      const gate = computeMilestoneCardCompletionGate({
        ...baseInput,
        type: "grant",
        completionProof: "https://example.com/proof",
      });

      expect(gate.showSection).toBe(true);
      expect(gate.showTimelineHeader).toBe(true);
    });

    it("should_show_section_when_only_completionDeliverables_present", () => {
      const gate = computeMilestoneCardCompletionGate({
        ...baseInput,
        type: "grant",
        completionDeliverables: [{ name: "Report" }],
      });

      expect(gate.showSection).toBe(true);
      expect(gate.showTimelineHeader).toBe(true);
    });
  });

  describe("default state", () => {
    it("should_hide_section_for_pending_milestone_with_no_content", () => {
      const gate = computeMilestoneCardCompletionGate(baseInput);

      expect(gate.showSection).toBe(false);
      expect(gate.showTimelineHeader).toBe(false);
    });
  });
});
