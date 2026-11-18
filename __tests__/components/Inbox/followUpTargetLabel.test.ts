import {
  previewFollowUpTarget,
  toFollowUpTargetInput,
} from "@/components/Inbox/followUpTargetLabel";

describe("toFollowUpTargetInput", () => {
  it("keeps a kept suggestion marked with how it was matched", () => {
    expect(
      toFollowUpTargetInput({
        kind: "dm",
        teamId: "T1",
        slackUserId: "U1",
        displayName: "Mahesh",
        matchedBy: "program_reviewer",
        personName: "Mahesh",
        source: "suggested",
      })
    ).toEqual({
      kind: "dm",
      teamId: "T1",
      slackUserId: "U1",
      personName: "Mahesh",
      matchedBy: "program_reviewer",
    });
  });

  it("sends a hand-picked person without a match source", () => {
    expect(
      toFollowUpTargetInput({
        kind: "dm",
        teamId: "T1",
        slackUserId: "U1",
        displayName: "Mahesh",
        matchedBy: "manual",
        source: "manual",
      })
    ).toEqual({ kind: "dm", teamId: "T1", slackUserId: "U1", personName: undefined });
  });

  it("keeps a nobody-found entry so the saved note still says so", () => {
    expect(
      toFollowUpTargetInput({
        kind: "unresolved",
        reason: "not_found",
        candidates: [],
        source: "suggested",
      })
    ).toEqual({ kind: "unresolved", reason: "not_found", candidates: [], personName: undefined });
  });

  it("drops the Slack-not-connected marker", () => {
    expect(
      toFollowUpTargetInput({
        kind: "unresolved",
        reason: "author_not_connected",
        candidates: [],
        source: "suggested",
      })
    ).toBeNull();
  });
});

describe("previewFollowUpTarget", () => {
  it("reads the channel and thread out of a message link", () => {
    expect(
      previewFollowUpTarget(
        {
          kind: "thread",
          teamId: "T1",
          permalink: "https://acme.slack.com/archives/C0GEN/p1699999999123456",
        },
        ""
      )
    ).toMatchObject({ kind: "thread", channelId: "C0GEN", threadTs: "1699999999.123456" });
  });

  it("labels a picked channel with its name", () => {
    expect(
      previewFollowUpTarget({ kind: "channel", teamId: "T1", channelId: "C1" }, "grants")
    ).toMatchObject({ kind: "channel", channelName: "grants", source: "manual" });
  });
});
