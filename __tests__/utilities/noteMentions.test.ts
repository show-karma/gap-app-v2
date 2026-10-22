import type { ICommunityActionItem } from "@/types/funding-platform";
import {
  buildNoteMentionToken,
  insertNoteMention,
  matchesNoteFilter,
  noteMentionFromNote,
  noteSnippet,
  parseNoteMentions,
  splitNoteMentions,
} from "@/utilities/noteMentions";

function makeNote(overrides: Partial<ICommunityActionItem> = {}): ICommunityActionItem {
  return {
    id: "n1",
    milestoneUID: "0xms",
    grantUID: "0xg",
    applicationReference: null,
    communityUID: "0xc",
    programId: "1_10",
    content: "PENDING PAYOUT:\n10/13/26 - invoice received",
    followUpAt: null,
    completedAt: null,
    completedByAddress: null,
    createdByAddress: "0xa",
    createdByName: "Erin",
    createdAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
    projectUid: "0xp",
    projectTitle: "Plumbline",
    milestoneTitle: "Milestone 2",
    applicationTitle: null,
    ...overrides,
  };
}

describe("noteMentions", () => {
  it("should_round_trip_a_token_through_parse", () => {
    const token = buildNoteMentionToken({
      label: "Plumbline · M2: hi",
      noteId: "n1",
      itemId: "0xms",
    });

    expect(parseNoteMentions(`see ${token} please`)).toEqual([
      { label: "Plumbline · M2: hi", noteId: "n1", itemId: "0xms", raw: token },
    ]);
  });

  it("should_strip_brackets_from_the_label_so_the_token_stays_parseable", () => {
    const token = buildNoteMentionToken({ label: "A [B] C", noteId: "n1", itemId: "x" });

    expect(parseNoteMentions(token)[0]?.label).toBe("A  B  C");
  });

  it("should_split_text_around_mentions_in_order", () => {
    const token = buildNoteMentionToken({ label: "L", noteId: "n1", itemId: "x" });

    expect(splitNoteMentions(`before ${token} after`)).toEqual([
      { type: "text", text: "before " },
      { type: "mention", mention: { label: "L", noteId: "n1", itemId: "x", raw: token } },
      { type: "text", text: " after" },
    ]);
  });

  it("should_replace_the_typed_at_filter_with_the_token", () => {
    const content = "Same as @plum and more";
    const cursor = "Same as @plum".length;

    const next = insertNoteMention(content, cursor, { label: "L", noteId: "n1", itemId: "x" });

    expect(next).toBe("Same as @[L](note:n1/x)  and more");
  });

  it("should_build_the_label_from_where_the_note_lives_and_its_first_line", () => {
    expect(noteMentionFromNote(makeNote())).toEqual({
      label: "Plumbline · Milestone 2: PENDING PAYOUT:",
      noteId: "n1",
      itemId: "0xms",
    });
  });

  it("should_point_application_notes_at_the_application_reference", () => {
    const note = makeNote({
      milestoneUID: null,
      applicationReference: "APP-7",
      milestoneTitle: null,
      applicationTitle: "Batch 3",
    });

    expect(noteMentionFromNote(note)?.itemId).toBe("APP-7");
    expect(noteMentionFromNote(note)?.label).toContain("Plumbline · Batch 3");
  });

  it("should_shorten_long_first_lines", () => {
    expect(noteSnippet(`${"x".repeat(60)}\nsecond`)).toHaveLength(40);
    expect(noteSnippet("\n\n  short  ")).toBe("short");
  });

  it("should_match_the_filter_against_location_and_content", () => {
    expect(matchesNoteFilter(makeNote(), "plumb")).toBe(true);
    expect(matchesNoteFilter(makeNote(), "invoice rec")).toBe(true);
    expect(matchesNoteFilter(makeNote(), "zzz")).toBe(false);
    expect(matchesNoteFilter(makeNote(), "")).toBe(true);
  });
});
