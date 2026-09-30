"use client";

import pluralize from "pluralize";
import { type FC, memo, type ReactNode, useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useSimocracyComments,
  useSimocracyCouncil,
  useSimocracyProgramSummary,
} from "@/hooks/useApplicationIntegrations";
import { useSimocracyMilestoneVerdicts } from "@/hooks/useSimocracyMilestoneVerdicts";
import type {
  SimocracyCommentRow,
  SimocracyMilestoneVerdictRow,
} from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { EvaluationFeedback } from "./EvaluationFeedback";
import { PendingVerdicts } from "./PendingVerdicts";
import { SimAuthor, SimSectionHeading } from "./SimIdentity";

// Long comments collapse to three lines with a Show more/less toggle, matching
// the sim-evaluation reasoning treatment in CouncilEvaluations.
const CLAMP_MIN_CHARS = 180;
const CLAMP_MIN_LINES = 3;

interface MilestoneFilter {
  uid: string;
  title: string;
}

// Verdicts Karma posted carry the milestone uid; comments synced from
// elsewhere are matched on their "Milestone: <title>" line instead.
function isAboutMilestone(comment: SimocracyCommentRow, milestone: MilestoneFilter): boolean {
  if (comment.milestoneUid)
    return comment.milestoneUid.toLowerCase() === milestone.uid.toLowerCase();
  return splitMilestone(comment.text).milestone === milestone.title;
}

interface CommentFeedbackContext {
  referenceNumber: string;
  viewerAddresses: Set<string>;
  canGiveFeedback: (simUri: string) => boolean;
}

interface CommentNode extends SimocracyCommentRow {
  replies: CommentNode[];
}

// Builds the reply tree: roots (no parent, or parent missing from the set) in
// chronological order, each with its replies nested under it.
function buildThreads(comments: SimocracyCommentRow[]): CommentNode[] {
  const byUri = new Map<string, CommentNode>();
  for (const comment of comments) {
    byUri.set(comment.commentUri, { ...comment, replies: [] });
  }
  const roots: CommentNode[] = [];
  for (const node of byUri.values()) {
    const parent = node.parentCommentUri ? byUri.get(node.parentCommentUri) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

// Milestone evaluations open with a "Milestone: <title>" line (Sims post one
// comment per milestone); everything else is round deliberation. The line is
// lifted into the section heading and dropped from the body.
const MILESTONE_LINE = /^Milestone:\s*(.+)$/;

const ATTRIBUTION_LINE = /^\*\*Sim milestone evaluation — .+\*\*$/;

function splitMilestone(text: string): { milestone: string | null; body: string } {
  const lines = text.split("\n");
  for (let i = 0; i < Math.min(2, lines.length); i++) {
    const match = MILESTONE_LINE.exec(lines[i].trim());
    if (match) {
      // The header already names the milestone and the Sim; both lines go.
      const rest = [...lines.slice(0, i), ...lines.slice(i + 1)];
      const body = rest.filter((line, index) => !(index < 2 && ATTRIBUTION_LINE.test(line.trim())));
      return { milestone: match[1].trim(), body: body.join("\n").trim() };
    }
  }
  return { milestone: null, body: text };
}

interface CommentGroup {
  milestone: string | null;
  threads: CommentNode[];
}

function groupByMilestone(threads: CommentNode[]): CommentGroup[] {
  const groups = new Map<string | null, CommentNode[]>();
  for (const node of threads) {
    const { milestone, body } = splitMilestone(node.text);
    const bucket = groups.get(milestone);
    const entry = milestone ? { ...node, text: body } : node;
    if (bucket) bucket.push(entry);
    else groups.set(milestone, [entry]);
  }
  const milestones = [...groups.entries()]
    .filter(([key]) => key !== null)
    .map(([milestone, nodes]) => ({ milestone, threads: nodes }));
  const deliberation = groups.get(null);
  return deliberation ? [...milestones, { milestone: null, threads: deliberation }] : milestones;
}

function shortenDid(did: string): string {
  return did.length > 20 ? `${did.slice(0, 12)}…${did.slice(-4)}` : did;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  feedback?: CommentFeedbackContext;
  avatars: Map<string, string | null>;
}

const CommentItem: FC<CommentItemProps> = memo(({ node, depth, feedback, avatars }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong =
    node.text.length > CLAMP_MIN_CHARS || node.text.split("\n").length > CLAMP_MIN_LINES;
  const bodyId = `sim-comment-${node.commentUri.split("/").pop()}`;

  return (
    <div className={depth > 0 ? "mt-3 border-l border-gray-200 pl-4 dark:border-gray-700" : ""}>
      <div className="rounded-lg border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-zinc-800">
        {node.authorSimUri ? (
          <SimAuthor
            name={node.authorName ?? "Sim"}
            avatar={avatars.get(node.authorSimUri)}
            trailing={
              node.createdAt && (
                <time
                  dateTime={node.createdAt}
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  {formatDate(node.createdAt)}
                </time>
              )
            }
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span
              className="font-mono text-xs text-gray-500 dark:text-gray-400"
              title={node.authorDid}
            >
              {node.authorName ?? shortenDid(node.authorDid)}
            </span>
            {node.createdAt && (
              <time
                dateTime={node.createdAt}
                className="shrink-0 text-xs text-gray-500 dark:text-gray-400"
              >
                {formatDate(node.createdAt)}
              </time>
            )}
          </div>
        )}
        <div
          id={bodyId}
          className={cn(
            "mt-2.5 break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300",
            !expanded &&
              isLong &&
              "max-h-28 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"
          )}
        >
          <MarkdownPreview variant="inline" source={node.text} />
        </div>
        {isLong && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls={bodyId}
            className="mt-2 h-auto p-0 text-xs font-medium text-gray-500 hover:text-gray-900 hover:no-underline dark:text-gray-400 dark:hover:text-white"
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}
        {feedback && node.authorSimUri && (
          <EvaluationFeedback
            referenceNumber={feedback.referenceNumber}
            subject={{ commentUri: node.commentUri }}
            simUri={node.authorSimUri}
            canGiveFeedback={feedback.canGiveFeedback(node.authorSimUri)}
            viewerAddresses={feedback.viewerAddresses}
          />
        )}
      </div>
      {node.replies.map((reply) => (
        <CommentItem
          key={reply.commentUri}
          node={reply}
          depth={depth + 1}
          feedback={feedback}
          avatars={avatars}
        />
      ))}
    </div>
  );
});
CommentItem.displayName = "CommentItem";

export const SimComments: FC<{
  referenceNumber: string;
  feedback?: CommentFeedbackContext;
  /** Narrows the list to one milestone's verdicts, rendered flat without headings. */
  milestone?: MilestoneFilter;
  /** Reviewer surface: also loads the private drafts awaiting approval. */
  review?: boolean;
}> = ({ referenceNumber, feedback, milestone, review = false }) => {
  const { data, isLoading } = useSimocracyComments(referenceNumber);
  const { data: drafts } = useSimocracyMilestoneVerdicts(referenceNumber, { enabled: review });
  // The program summary answers instantly but only lists Sims linked to a
  // reviewer; the council (read live from ATProto, slower) carries every Sim
  // of the gathering and fills in the rest once it arrives.
  const { data: summary } = useSimocracyProgramSummary(data?.programId ?? undefined);
  const { data: council } = useSimocracyCouncil(data?.programId ?? undefined);
  const avatars = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const sim of summary?.sims ?? []) map.set(sim.simUri, sim.avatar);
    for (const sim of council ?? [])
      if (sim.avatar || !map.has(sim.simUri)) map.set(sim.simUri, sim.avatar);
    return map;
  }, [summary?.sims, council]);
  const groups = useMemo(() => {
    const comments = data?.comments ?? [];
    if (!milestone) return groupByMilestone(buildThreads(comments));
    const own = comments.filter((comment) => isAboutMilestone(comment, milestone));
    const threads = buildThreads(own).map((node) => ({
      ...node,
      text: splitMilestone(node.text).body,
    }));
    return threads.length > 0 ? [{ milestone: milestone.title, threads }] : [];
  }, [data?.comments, milestone]);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse" data-testid="sim-comments-loading">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="h-20 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-zinc-800" />
      </div>
    );
  }

  // Hidden when the viewer lacks access to Sim comments.
  if (!data || data.forbidden) {
    return null;
  }

  const published = (
    <PublishedComments
      groups={groups}
      milestone={milestone}
      feedback={feedback}
      avatars={avatars}
      headed={!review || !drafts || drafts.forbidden}
    />
  );

  // Reviewers get the three states side by side; everyone else sees only
  // what is public.
  if (review && drafts && !drafts.forbidden) {
    return (
      <VerdictTabs
        referenceNumber={referenceNumber}
        verdicts={drafts.verdicts}
        milestoneUid={milestone?.uid}
        avatars={avatars}
        feedback={feedback}
        publishedCount={groups.reduce((sum, group) => sum + group.threads.length, 0)}
        flat={!!milestone}
      >
        {published}
      </VerdictTabs>
    );
  }

  return published;
};

type VerdictTab = "pending" | "published" | "dismissed";

interface VerdictTabsProps {
  referenceNumber: string;
  verdicts: SimocracyMilestoneVerdictRow[];
  milestoneUid?: string;
  avatars: Map<string, string | null>;
  feedback?: CommentFeedbackContext;
  publishedCount: number;
  flat: boolean;
  children: ReactNode;
}

const VerdictTabs: FC<VerdictTabsProps> = ({
  referenceNumber,
  verdicts,
  milestoneUid,
  avatars,
  feedback,
  publishedCount,
  flat,
  children,
}) => {
  const scoped = milestoneUid
    ? verdicts.filter(
        (verdict) => verdict.milestoneUid.toLowerCase() === milestoneUid.toLowerCase()
      )
    : verdicts;
  const pendingCount = scoped.filter(
    (verdict) => verdict.status === "pending_review" || verdict.status === "publishing"
  ).length;
  const dismissedCount = scoped.filter((verdict) => verdict.status === "dismissed").length;
  const [tab, setTab] = useState<VerdictTab>(pendingCount > 0 ? "pending" : "published");
  const shared = { referenceNumber, verdicts, avatars, feedback, milestoneUid, hideHeading: true };

  return (
    <div className="space-y-3">
      {!flat && <SimSectionHeading title="Sim evaluations" />}
      <Tabs value={tab} onValueChange={(value) => setTab(value as VerdictTab)}>
        <TabsList aria-label="Sim verdicts by state">
          <TabsTrigger value="pending">Pending review ({pendingCount})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedCount})</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed ({dismissedCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-3">
          <PendingVerdicts {...shared} show="open" />
        </TabsContent>
        <TabsContent value="published" className="mt-3">
          {children}
        </TabsContent>
        <TabsContent value="dismissed" className="mt-3">
          <PendingVerdicts {...shared} show="dismissed" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface PublishedCommentsProps {
  groups: CommentGroup[];
  milestone?: MilestoneFilter;
  feedback?: CommentFeedbackContext;
  avatars: Map<string, string | null>;
  /** Carry the section heading; false inside the reviewer tabs, which have their own. */
  headed: boolean;
}

const PublishedComments: FC<PublishedCommentsProps> = ({
  groups,
  milestone,
  feedback,
  avatars,
  headed,
}) => {
  if (groups.length === 0) {
    return (
      <div className="space-y-2">
        {headed && !milestone && <SimSectionHeading title="Sim evaluations" />}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {milestone
            ? "No published Sim evaluations for this milestone yet."
            : "No published Sim evaluations on this application yet."}
        </p>
      </div>
    );
  }

  if (milestone) {
    return (
      <div className="space-y-3">
        {groups[0].threads.map((node) => (
          <CommentItem
            key={node.commentUri}
            node={node}
            depth={0}
            feedback={feedback}
            avatars={avatars}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {headed && <SimSectionHeading title="Sim evaluations" />}
      {groups.map((group) => (
        <details key={group.milestone ?? "deliberation"} open className="group space-y-3">
          <summary className="flex cursor-pointer list-none items-baseline gap-2 rounded text-sm font-medium text-gray-900 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-white [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden="true"
              className="text-gray-400 transition-transform duration-150 group-open:rotate-90"
            >
              ▸
            </span>
            <h4 className="text-sm font-medium">
              {group.milestone ? `Milestone: ${group.milestone}` : "Round deliberation"}
            </h4>
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              {group.threads.length} {pluralize("Sim verdict", group.threads.length)}
            </span>
          </summary>
          {group.threads.map((node) => (
            <CommentItem
              key={node.commentUri}
              node={node}
              depth={0}
              feedback={feedback}
              avatars={avatars}
            />
          ))}
        </details>
      ))}
    </div>
  );
};
