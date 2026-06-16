import type { SocialChannel, SocialMetrics } from "@/types/donor-research";
import { briefDisplay } from "../report-brief/fonts";
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
 * 60-day posting cadence, average likes, and recency. Styled to match the
 * brief's "Financials (last 3 years)" table.
 *
 * Renders only the channels we actually resolved; if none resolved the
 * section is silent (no "no social" noise).
 */
export function SocialPresence({ metrics }: SocialPresenceProps) {
  const channels = metrics?.byChannel.filter((channel) => channel.available) ?? [];
  if (!metrics || channels.length === 0) return null;

  const headCell =
    "py-2 pl-4 text-right text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground";
  const cell = "py-2 pl-4 text-right tabular-nums text-foreground/70";

  return (
    <div className="mt-8">
      <p
        className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
      >
        Social presence (last 60 days)
      </p>
      <table className={`${briefDisplay.className} mt-3 w-full border-collapse text-sm`}>
        <thead>
          <tr className="border-y border-border/50">
            <th className="py-2 pr-4 text-left text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Channel
            </th>
            <th className={headCell}>Followers</th>
            <th className={headCell}>Posts</th>
            <th className={headCell}>Likes / post</th>
            <th className={headCell}>Last post</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((channel) => {
            const lastPost = channel.lastPostAt
              ? (relativeDays(Date.parse(channel.lastPostAt)) ?? "—")
              : "—";
            return (
              <tr key={channel.channel} className="border-b border-border/50 last:border-b-0">
                <td className="py-2 pr-4 text-left font-medium tabular-nums text-foreground/80">
                  {channel.profileUrl ? (
                    <a
                      href={channel.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-[3px] hover:text-foreground hover:underline"
                    >
                      {CHANNEL_LABELS[channel.channel]}
                    </a>
                  ) : (
                    CHANNEL_LABELS[channel.channel]
                  )}
                </td>
                <td className={cell}>{formatCompactNumber(channel.followers)}</td>
                <td className={cell}>{channel.postsInWindow}</td>
                <td className={cell}>
                  {channel.avgLikes !== null ? `~${formatCompactNumber(channel.avgLikes)}` : "—"}
                </td>
                <td className={cell}>{lastPost}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
