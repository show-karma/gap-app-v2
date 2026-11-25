import type {
  SimocracyVerdictRow,
  SimocracyVerdictSubject,
} from "@/services/fundingApplicationIntegrations.service";

export type VerdictFilter = "all" | "pending" | "published" | "dismissed";
export type VerdictBucket = Exclude<VerdictFilter, "all">;

export interface VerdictCounts {
  pending: number;
  published: number;
  dismissed: number;
}

// A pair holds one slot on Simocracy, so it can sit in two buckets at once:
// a version live (published) while a newer one waits (pending).
export function verdictBuckets(verdict: SimocracyVerdictRow): VerdictBucket[] {
  const out: VerdictBucket[] = [];
  if (verdict.publishedRevision !== null) out.push("published");
  if (verdict.status === "dismissed") out.push("dismissed");
  else if (verdict.status !== "published") out.push("pending");
  return out;
}

export function inVerdictBucket(verdict: SimocracyVerdictRow, filter: VerdictFilter): boolean {
  return filter === "all" || verdictBuckets(verdict).includes(filter);
}

export function countVerdicts(verdicts: SimocracyVerdictRow[]): VerdictCounts {
  const counts: VerdictCounts = { pending: 0, published: 0, dismissed: 0 };
  for (const verdict of verdicts) for (const key of verdictBuckets(verdict)) counts[key] += 1;
  return counts;
}

export const APPLICATION_SUBJECT_KEY = "application";

// Milestone keys carry a prefix so no milestone uid can collide with the
// application's key.
export function verdictSubjectKey(verdict: SimocracyVerdictRow): string {
  if (verdict.subject === "application" || !verdict.milestoneUid) return APPLICATION_SUBJECT_KEY;
  return milestoneSubjectKey(verdict.milestoneUid);
}

export function milestoneSubjectKey(milestoneUid: string): string {
  return `milestone:${milestoneUid.toLowerCase()}`;
}

export interface VerdictSubjectGroup {
  key: string;
  subject: SimocracyVerdictSubject;
  title: string;
  verdicts: SimocracyVerdictRow[];
  counts: VerdictCounts;
}

// The application comes first: it is what every milestone hangs off. Then
// milestones with something waiting, then by title. Sims alphabetical inside.
export function groupVerdictsBySubject(verdicts: SimocracyVerdictRow[]): VerdictSubjectGroup[] {
  const groups = new Map<string, VerdictSubjectGroup>();
  for (const verdict of verdicts) {
    const key = verdictSubjectKey(verdict);
    const subject: SimocracyVerdictSubject =
      key === APPLICATION_SUBJECT_KEY ? "application" : "milestone";
    const group = groups.get(key) ?? {
      key,
      subject,
      title:
        subject === "application"
          ? "Application"
          : (verdict.milestoneTitle ?? "Untitled milestone"),
      verdicts: [],
      counts: { pending: 0, published: 0, dismissed: 0 },
    };
    group.verdicts.push(verdict);
    groups.set(key, group);
  }
  const list = [...groups.values()].map((group) => ({
    ...group,
    verdicts: [...group.verdicts].sort((a, b) => a.simName.localeCompare(b.simName)),
    counts: countVerdicts(group.verdicts),
  }));
  return list.sort(
    (a, b) =>
      Number(b.subject === "application") - Number(a.subject === "application") ||
      Number(b.counts.pending > 0) - Number(a.counts.pending > 0) ||
      a.title.localeCompare(b.title)
  );
}

export type CommentSubject =
  | { kind: "application" }
  | { kind: "milestone"; title: string }
  | { kind: "deliberation" };

// Milestone verdicts open with "Milestone: <title>" then the attribution line;
// application verdicts open with their attribution line alone. Both are lifted
// into the group heading and dropped from the body.
const MILESTONE_LINE = /^Milestone:\s*(.+)$/;
const MILESTONE_ATTRIBUTION_LINE = /^\*\*Sim milestone evaluation — .+\*\*$/;
const APPLICATION_ATTRIBUTION_LINE = /^\*\*Sim application evaluation — .+\*\*$/;
const HEADER_LINES = 2;

function dropHeaderLine(lines: string[], pattern: RegExp): string[] {
  const index = lines.slice(0, HEADER_LINES).findIndex((line) => pattern.test(line.trim()));
  return index === -1 ? lines : [...lines.slice(0, index), ...lines.slice(index + 1)];
}

export function splitCommentSubject(
  text: string,
  verdictSubject?: SimocracyVerdictSubject | null
): { subject: CommentSubject; body: string } {
  const lines = text.split("\n");
  const head = lines.slice(0, HEADER_LINES).map((line) => line.trim());

  if (verdictSubject !== "application") {
    for (let index = 0; index < head.length; index++) {
      const match = MILESTONE_LINE.exec(head[index]);
      if (!match) continue;
      const rest = [...lines.slice(0, index), ...lines.slice(index + 1)];
      return {
        subject: { kind: "milestone", title: match[1].trim() },
        body: dropHeaderLine(rest, MILESTONE_ATTRIBUTION_LINE).join("\n").trim(),
      };
    }
  }

  if (
    verdictSubject === "application" ||
    head.some((line) => APPLICATION_ATTRIBUTION_LINE.test(line))
  ) {
    return {
      subject: { kind: "application" },
      body: dropHeaderLine(lines, APPLICATION_ATTRIBUTION_LINE).join("\n").trim(),
    };
  }

  return { subject: { kind: "deliberation" }, body: text };
}

interface SubjectComment {
  text: string;
  verdictSubject?: SimocracyVerdictSubject | null;
}

export interface CommentSubjectGroup<T> {
  key: string;
  subject: CommentSubject;
  threads: T[];
}

// Application first, milestones in the order they were first discussed,
// round deliberation last.
export function groupCommentsBySubject<T extends SubjectComment>(
  threads: T[]
): CommentSubjectGroup<T>[] {
  const groups = new Map<string, CommentSubjectGroup<T>>();
  for (const node of threads) {
    const { subject, body } = splitCommentSubject(node.text, node.verdictSubject);
    const key = subject.kind === "milestone" ? `milestone:${subject.title}` : subject.kind;
    const entry = subject.kind === "deliberation" ? node : { ...node, text: body };
    const group = groups.get(key);
    if (group) group.threads.push(entry);
    else groups.set(key, { key, subject, threads: [entry] });
  }
  const list = [...groups.values()];
  const rank = (group: CommentSubjectGroup<T>) =>
    group.subject.kind === "application" ? 0 : group.subject.kind === "milestone" ? 1 : 2;
  return list
    .map((group, index) => ({ group, index }))
    .sort((a, b) => rank(a.group) - rank(b.group) || a.index - b.index)
    .map(({ group }) => group);
}
