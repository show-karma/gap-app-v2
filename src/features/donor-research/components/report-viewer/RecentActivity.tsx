"use client";

import { ArrowUpRight } from "lucide-react";
import type { RecentMention } from "@/types/donor-research";

interface RecentActivityProps {
  mentions: readonly RecentMention[];
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Lists the validated mentions that established this candidate's
 * freshness signal. Each row is a clickable link with the date as the
 * scannable eyebrow, the publisher as the trust anchor, and the
 * headline as the editorial hook.
 *
 * Renders nothing when there are no mentions — silence is the correct
 * empty state. Don't show "(no mentions found)" — that's noise.
 */
export function RecentActivity({ mentions }: RecentActivityProps) {
  if (mentions.length === 0) return null;

  return (
    <section className="rounded-md border border-border/60 bg-muted/20 p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Recent activity
      </p>
      <ul className="flex flex-col gap-2.5">
        {mentions.map((mention) => (
          <li key={mention.url}>
            <a
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2.5 text-sm transition-colors"
            >
              <span className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.06em] text-muted-foreground/70 w-[58px] shrink-0">
                {formatDate(mention.publishedDate)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-foreground/90 group-hover:text-brand-emphasis dark:group-hover:text-brand-subtle">
                  {mention.title ?? hostnameFromUrl(mention.url)}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className={mention.kind === "own_domain" ? "italic" : ""}>
                    {mention.publisher ?? hostnameFromUrl(mention.url)}
                  </span>
                  <ArrowUpRight
                    className="h-3 w-3 opacity-50 group-hover:opacity-100"
                    aria-hidden
                  />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
