import { describeFollowUp, partitionByFollowUp, stageAgeTone } from "@/components/Inbox/stageAge";
import type { InboxItem } from "@/components/Inbox/types";

function makeItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "MS-1",
    kind: "milestone",
    bucket: "action",
    status: "verified",
    title: "Milestone One",
    programId: "p1",
    activitySort: 0,
    ...overrides,
  };
}

/** Local calendar day, offset by whole days — mirrors utilities/calendarDay. */
function dayOffset(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}T00:00:00.000Z`;
}

const formatDay = (iso: string) => iso.slice(0, 10);

describe("stageAgeTone", () => {
  it("should_escalate_bar_colour_as_days_stuck_increase", () => {
    expect(stageAgeTone(1).bar).toBe("bg-amber-500");
    expect(stageAgeTone(29).bar).toBe("bg-amber-500");
    expect(stageAgeTone(30).bar).toBe("bg-red-500");
    expect(stageAgeTone(89).bar).toBe("bg-red-500");
    expect(stageAgeTone(90).bar).toBe("bg-red-700");
    expect(stageAgeTone(379).bar).toBe("bg-red-700");
  });

  // The scale must stay inside the palette this feature already uses — the
  // stage dots in ATTENTION_META / InboxList and their existing text tones.
  it("should_only_use_palette_steps_already_used_by_the_inbox", () => {
    const allowed = new Set([
      "bg-amber-500",
      "bg-red-500",
      "bg-red-700",
      "bg-gray-200 dark:bg-zinc-700",
    ]);
    for (const days of [0, 15, 45, 120, 400, undefined]) {
      expect(allowed.has(stageAgeTone(days).bar)).toBe(true);
    }
  });

  // Only the worst band tints the numeral; a 45-day-old item is not an alarm.
  it("should_tint_the_numeral_only_past_the_90_day_band", () => {
    expect(stageAgeTone(29).text).not.toContain("text-red");
    expect(stageAgeTone(89).text).not.toContain("text-red");
    expect(stageAgeTone(90).text).toContain("text-red");
  });

  // Reviewer-scoped rows carry no stage age at all.
  it("should_fall_back_to_a_neutral_tone_when_days_are_absent", () => {
    expect(stageAgeTone(undefined).bar).toContain("bg-gray-200");
    expect(stageAgeTone(Number.NaN).bar).toContain("bg-gray-200");
  });

  it("should_not_use_raw_hex_values", () => {
    for (const days of [1, 45, 120, 400, undefined]) {
      const tone = stageAgeTone(days);
      expect(tone.bar).not.toMatch(/#[0-9a-f]{3,8}/i);
      expect(tone.text).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
  });
});

describe("describeFollowUp", () => {
  it("should_mark_a_past_date_overdue_and_weight_it", () => {
    const result = describeFollowUp(dayOffset(-52), formatDay);
    expect(result.scheduled).toBe(true);
    expect(result.overdue).toBe(true);
    expect(result.label).toContain("52 days ago");
    expect(result.className).toContain("text-red-600");
  });

  // A date landing ON today is due, never overdue — see utilities/calendarDay.
  it("should_treat_today_as_due_rather_than_overdue", () => {
    const result = describeFollowUp(dayOffset(0), formatDay);
    expect(result.overdue).toBe(false);
    expect(result.label).toContain("today");
  });

  it("should_describe_an_upcoming_date_without_alarm_styling", () => {
    const result = describeFollowUp(dayOffset(7), formatDay);
    expect(result.overdue).toBe(false);
    expect(result.label).toContain("in 7 days");
    expect(result.className).not.toContain("text-red");
  });

  // An unset date must still render: these rows sort last, and a blank slot
  // gives the reader no reason why.
  it("should_label_an_unset_date_rather_than_render_blank", () => {
    for (const value of [null, undefined, ""]) {
      const result = describeFollowUp(value, formatDay);
      expect(result.scheduled).toBe(false);
      expect(result.overdue).toBe(false);
      expect(result.label).toBe("No follow-up");
    }
  });
});

describe("partitionByFollowUp", () => {
  it("should_split_dated_from_undated_and_preserve_server_order", () => {
    const items = [
      makeItem({ id: "a", nextFollowUpAt: dayOffset(-52) }),
      makeItem({ id: "b", nextFollowUpAt: null }),
      makeItem({ id: "c", nextFollowUpAt: dayOffset(3) }),
      makeItem({ id: "d" }),
    ];

    const { scheduled, unscheduled } = partitionByFollowUp(items);

    expect(scheduled.map((i) => i.id)).toEqual(["a", "c"]);
    expect(unscheduled.map((i) => i.id)).toEqual(["b", "d"]);
  });

  it("should_return_empty_lists_for_an_empty_feed", () => {
    expect(partitionByFollowUp([])).toEqual({ scheduled: [], unscheduled: [] });
  });
});
