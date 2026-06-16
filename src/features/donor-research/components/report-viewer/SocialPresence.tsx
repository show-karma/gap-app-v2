import type { SocialChannel, SocialChannelMetric, SocialMetrics } from "@/types/donor-research";
import { formatCompactNumber, relativeDays } from "../report-brief/text-utils";

const CHANNEL_LABELS: Record<SocialChannel, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
};

interface SocialPresenceProps {
  metrics: SocialMetrics | null;
}

/**
 * Per-channel social-activity snapshot on a candidate (DEV-385): followers,
 * 60-day posting cadence, average likes, and recency. Mirrors the
 * `RecentActivity` section's visual register.
 *
 * Renders only the channels we actually resolved; if none resolved the
 * section is silent (no "no social" noise) — same convention as
 * RecentActivity.
 */
export function SocialPresence({ metrics }: SocialPresenceProps) {
  const channels = metrics?.byChannel.filter((channel) => channel.available) ?? [];
  if (!metrics || channels.length === 0) return null;

  return (
    <section className="rounded-md border border-border/60 bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Social presence
        </p>
        {metrics.totalFollowers !== null ? (
          <span className="text-[11px] text-muted-foreground">
            <span className="font-mono tabular-nums text-foreground/80">
              {formatCompactNumber(metrics.totalFollowers)}
            </span>{" "}
            followers
          </span>
        ) : null}
      </div>

      <ul className="flex flex-col gap-3">
        {channels.map((channel) => (
          <SocialChannelRow key={channel.channel} metric={channel} />
        ))}
      </ul>
    </section>
  );
}

function SocialChannelRow({ metric }: { metric: SocialChannelMetric }) {
  const lastPost = metric.lastPostAt ? relativeDays(Date.parse(metric.lastPostAt)) : null;

  const stats: string[] = [];
  if (metric.followers !== null) {
    stats.push(`${formatCompactNumber(metric.followers)} followers`);
  }
  stats.push(`${metric.postsInWindow} ${metric.postsInWindow === 1 ? "post" : "posts"} · 60d`);
  if (metric.avgLikes !== null) {
    stats.push(`~${formatCompactNumber(metric.avgLikes)} avg likes`);
  }

  return (
    <li className="text-sm">
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-foreground/90">{CHANNEL_LABELS[metric.channel]}</span>
        {lastPost ? (
          <span className="shrink-0 text-[11px] text-muted-foreground">{lastPost}</span>
        ) : null}
      </span>
      <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
        {stats.join(" · ")}
      </span>
    </li>
  );
}
