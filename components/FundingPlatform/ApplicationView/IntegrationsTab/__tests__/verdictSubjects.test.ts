import type { SimocracyVerdictRow } from "@/services/fundingApplicationIntegrations.service";
import {
  APPLICATION_SUBJECT_KEY,
  countVerdicts,
  groupCommentsBySubject,
  groupVerdictsBySubject,
  inVerdictBucket,
  milestoneSubjectKey,
  splitCommentSubject,
  verdictSubjectKey,
} from "../verdictSubjects";

function verdict(overrides: Partial<SimocracyVerdictRow> = {}): SimocracyVerdictRow {
  return {
    verdictId: "v1",
    subject: "milestone",
    milestoneUid: "0xM1",
    milestoneTitle: "Alpha",
    simUri: "at://sim/1",
    simName: "S1",
    commentUri: "at://c/1",
    text: "ok",
    status: "pending_review",
    revision: 1,
    publishedRevision: null,
    publishedAt: null,
    publishedBy: null,
    dismissedAt: null,
    dismissedBy: null,
    updatedAt: null,
    mayAct: true,
    canPublish: true,
    publishBlocker: null,
    feedback: [],
    revisions: [],
    ...overrides,
  };
}

const application = (overrides: Partial<SimocracyVerdictRow> = {}) =>
  verdict({ subject: "application", milestoneUid: null, milestoneTitle: null, ...overrides });

describe("verdict buckets", () => {
  it("counts a live pair with a newer pending version in both buckets", () => {
    const pair = verdict({ publishedRevision: 1, revision: 2 });
    expect(countVerdicts([pair])).toEqual({ pending: 1, published: 1, dismissed: 0 });
    expect(inVerdictBucket(pair, "pending")).toBe(true);
    expect(inVerdictBucket(pair, "published")).toBe(true);
    expect(inVerdictBucket(pair, "all")).toBe(true);
  });

  it("keeps a dismissed verdict out of pending", () => {
    const dismissed = verdict({ status: "dismissed" });
    expect(inVerdictBucket(dismissed, "pending")).toBe(false);
    expect(inVerdictBucket(dismissed, "dismissed")).toBe(true);
  });
});

describe("verdictSubjectKey", () => {
  it("gives every application verdict the same key", () => {
    expect(verdictSubjectKey(application())).toBe(APPLICATION_SUBJECT_KEY);
  });

  it("keys milestones case-insensitively and apart from the application", () => {
    expect(verdictSubjectKey(verdict({ milestoneUid: "0xAB" }))).toBe(milestoneSubjectKey("0xab"));
    expect(verdictSubjectKey(verdict({ milestoneUid: "application" }))).not.toBe(
      APPLICATION_SUBJECT_KEY
    );
  });
});

describe("groupVerdictsBySubject", () => {
  it("pins the application above milestones, then pending milestones first", () => {
    const groups = groupVerdictsBySubject([
      verdict({
        verdictId: "1",
        milestoneUid: "0xa",
        milestoneTitle: "Alpha",
        status: "published",
      }),
      verdict({ verdictId: "2", milestoneUid: "0xb", milestoneTitle: "Beta" }),
      application({ verdictId: "3", status: "published" }),
      verdict({
        verdictId: "4",
        milestoneUid: "0xc",
        milestoneTitle: "Gamma",
        status: "published",
      }),
    ]);

    expect(groups.map((group) => [group.subject, group.title])).toEqual([
      ["application", "Application"],
      ["milestone", "Beta"],
      ["milestone", "Alpha"],
      ["milestone", "Gamma"],
    ]);
  });

  it("orders Sims alphabetically inside a group and tallies its states", () => {
    const [group] = groupVerdictsBySubject([
      application({ verdictId: "b", simName: "Zed" }),
      application({ verdictId: "a", simName: "Ada", status: "published", publishedRevision: 1 }),
    ]);

    expect(group.verdicts.map((row) => row.simName)).toEqual(["Ada", "Zed"]);
    expect(group.counts).toEqual({ pending: 1, published: 1, dismissed: 0 });
  });

  it("names a milestone without a title", () => {
    const [group] = groupVerdictsBySubject([verdict({ milestoneTitle: null })]);
    expect(group.title).toBe("Untitled milestone");
  });
});

describe("splitCommentSubject", () => {
  it("lifts the milestone and its attribution line out of the body", () => {
    expect(
      splitCommentSubject("Milestone: Ship v1\n**Sim milestone evaluation — S1**\n\nShipped.")
    ).toEqual({ subject: { kind: "milestone", title: "Ship v1" }, body: "Shipped." });
  });

  it("recognises an application verdict by its header line", () => {
    expect(splitCommentSubject("**Sim application evaluation — S1**\n\nFund it.")).toEqual({
      subject: { kind: "application" },
      body: "Fund it.",
    });
  });

  it("trusts verdictSubject when the header is missing", () => {
    expect(splitCommentSubject("Fund it.", "application")).toEqual({
      subject: { kind: "application" },
      body: "Fund it.",
    });
  });

  it("never reads an application verdict as a milestone", () => {
    const { subject } = splitCommentSubject(
      "**Sim application evaluation — S1**\nMilestone: quoted text",
      "application"
    );
    expect(subject).toEqual({ kind: "application" });
  });

  it("treats anything else as round deliberation, untouched", () => {
    expect(splitCommentSubject("VERDICT: FUND\n**bold**")).toEqual({
      subject: { kind: "deliberation" },
      body: "VERDICT: FUND\n**bold**",
    });
  });

  it("only looks at the first two lines for a header", () => {
    const text = "Intro\nMore\n**Sim application evaluation — S1**";
    expect(splitCommentSubject(text).subject).toEqual({ kind: "deliberation" });
  });
});

describe("groupCommentsBySubject", () => {
  it("orders application, milestones as first discussed, then deliberation", () => {
    const groups = groupCommentsBySubject([
      { text: "Chatter" },
      { text: "Milestone: B\n\nok" },
      { text: "**Sim application evaluation — S1**\n\nFund it." },
      { text: "Milestone: A\n\nok" },
      { text: "Milestone: B\n\nagain" },
      { text: "No header", verdictSubject: "application" as const },
    ]);

    expect(groups.map((group) => group.subject)).toEqual([
      { kind: "application" },
      { kind: "milestone", title: "B" },
      { kind: "milestone", title: "A" },
      { kind: "deliberation" },
    ]);
    expect(groups[0].threads.map((node) => node.text)).toEqual(["Fund it.", "No header"]);
    expect(groups[1].threads.map((node) => node.text)).toEqual(["ok", "again"]);
    expect(groups[3].threads[0].text).toBe("Chatter");
  });
});
