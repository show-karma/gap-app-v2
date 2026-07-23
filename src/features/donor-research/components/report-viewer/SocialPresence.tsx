import type { SocialChannel, SocialMetrics } from "@/types/donor-research";
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
    "py-2 pl-4 text-right text-[10px] font-[650] uppercase tracking-[0.1em] text-sf-muted";
  const cell = "py-2 pl-4 text-right font-mono tabular-nums text-sf-ink";

  return (
    <div className="mt-6">
      <p className="text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
        Social presence (last 60 days)
      </p>
      <table className="mt-2.5 w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-y border-sf-line">
            <th className="py-2 pr-4 text-left text-[10px] font-[650] uppercase tracking-[0.1em] text-sf-muted">
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
              <tr key={channel.channel} className="border-b border-sf-line last:border-b-0">
                <td className="py-2 pr-4 text-left font-mono tabular-nums text-sf-ink">
                  {channel.profileUrl ? (
                    <a
                      href={channel.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-[3px] hover:text-sf-heading hover:underline"
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
