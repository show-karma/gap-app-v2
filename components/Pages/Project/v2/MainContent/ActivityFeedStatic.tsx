import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { renderMarkdownToHtml } from "@/utilities/markdown.server";
import { cn } from "@/utilities/tailwind";

interface ActivityFeedStaticProps {
  milestones: UnifiedMilestone[];
  className?: string;
}

// Read-only label for an activity type. Mirrors getActivityTypeLabel in the
// interactive ActivityFeed so the server twin reads the same as the client one.
function getActivityTypeLabel(milestone: UnifiedMilestone): string {
  switch (milestone.type) {
    case "grant_update":
      return "Grant Update";
    case "grant_received":
      return milestone.grantReceived?.programType === "hackathon"
        ? "Hackathon Participation"
        : "Grant Approved";
    case "endorsement":
      return "Endorsement";
    case "project":
    case "activity":
    case "update":
      return "Project Activity";
    default:
      return "Milestone";
  }
}

// Server-safe plain-text excerpt: render the markdown to HTML (markdown-it, no
// DOM dependency), strip tags, collapse whitespace, truncate. Used instead of
// the client markdown preview so the feed text is crawlable without shipping a
// markdown renderer to the browser.
function toPlainTextExcerpt(markdown: string | undefined, maxLength = 280): string {
  if (!markdown) return "";
  const text = renderMarkdownToHtml(markdown)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

function formatFeedDate(createdAt: string | null): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Server-rendered, read-only twin of the project activity feed.
 *
 * WHY: the interactive ActivityFeed (`UpdatesContent` → `ActivityFeed` →
 * ~2,000 lines of auth-aware, dialog-laden card components) is client-only, so
 * the project's actual content — milestone and update titles + descriptions —
 * never reached the server HTML and crawlers saw an empty feed (GSC
 * "Discovered – currently not crawled"). This component emits the same items
 * (type · title · description excerpt · date) into the initial HTML using the
 * same server-fetched data; the interactive feed replaces it on hydration
 * (see UpdatesContent). Pure server component — no hooks, no interactivity.
 */
export function ActivityFeedStatic({ milestones, className }: ActivityFeedStaticProps) {
  if (!milestones.length) return null;

  return (
    <ul
      className={cn("flex flex-col gap-6", className)}
      data-testid="activity-feed-static"
      // Hidden once the interactive client feed hydrates over it (see
      // UpdatesContent); present in the server HTML for crawlers and no-JS.
    >
      {milestones.map((milestone) => {
        const excerpt = toPlainTextExcerpt(milestone.description);
        const date = formatFeedDate(milestone.createdAt);
        return (
          <li
            key={milestone.uid}
            className="flex flex-col gap-1"
            data-testid="activity-item-static"
          >
            <span className="text-xs font-semibold text-muted-foreground">
              {getActivityTypeLabel(milestone)}
            </span>
            {milestone.title ? (
              <p className="text-sm font-semibold text-foreground">{milestone.title}</p>
            ) : null}
            {excerpt ? <p className="text-sm text-muted-foreground">{excerpt}</p> : null}
            {date ? (
              <time
                className="text-xs text-muted-foreground"
                dateTime={milestone.createdAt ?? undefined}
              >
                {date}
              </time>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
