/**
 * Sample report fixture used in the onboarding flow (F4).
 *
 * Renders a hard-coded illustrative report so the advisor sees what
 * they'll get before they commit to onboarding. Shape mirrors a real
 * report brief: top-3 one-pager cards + a full-list row, all built from
 * inline fixture data. No API calls.
 *
 * Intentionally not connected to PAGES or any real candidate — this is
 * marketing-shape content. Visually it reuses the report brief's Soft
 * building blocks (`RankBadge`, `OurTake`, `badgeClasses`) so the sample
 * matches the P3 report redesign (spec 2.3) rather than drifting into its
 * own bespoke look.
 */

import { memo } from "react";
import type { BadgeTone } from "@/components/Pages/Dashboard/v3/primitives";
import { badgeClasses } from "@/components/Pages/Dashboard/v3/soft-classes";
import type { SocialMetrics } from "@/types/donor-research";
import { OurTake, RankBadge } from "../report-brief/CandidateChrome";
import { compositeBand } from "../report-brief/scoring";
import { SocialPresence } from "../report-viewer/SocialPresence";

/** Keeps the static sample's "X days ago" labels evergreen. */
const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();

interface SampleCandidate {
  ein: string;
  name: string;
  composite: number;
  components: {
    freshness: number;
    impactRecency: number;
    donorMatch: number;
    compliance: number;
  };
  verdict: "verified" | "partial" | "flagged";
  onePager: string;
  social: SocialMetrics | null;
}

const TOP_THREE: SampleCandidate[] = [
  {
    ein: "94-3265648",
    name: "Cascade Watershed Council",
    composite: 0.91,
    components: { freshness: 0.95, impactRecency: 0.88, donorMatch: 0.92, compliance: 1.0 },
    verdict: "verified",
    onePager:
      "Cascade Watershed Council is a top pick for Pacific Northwest climate giving. Active program reporting in the last 30 days, verified IRS Pub 78 status, and a strong donor-match score against your climate criteria. A $25K gift would extend their streamside restoration partnership with three tribal nations.",
    social: {
      byChannel: [
        {
          channel: "linkedin",
          available: true,
          followers: 4200,
          postsInWindow: 9,
          lastPostAt: daysAgo(2),
          avgLikes: 63,
        },
        {
          channel: "instagram",
          available: true,
          followers: 12800,
          postsInWindow: 14,
          lastPostAt: daysAgo(1),
          avgLikes: 540,
        },
        {
          channel: "x",
          available: true,
          followers: 3100,
          postsInWindow: 21,
          lastPostAt: daysAgo(0),
          avgLikes: 18,
        },
        {
          channel: "facebook",
          available: true,
          followers: 9400,
          postsInWindow: 7,
          lastPostAt: daysAgo(3),
          avgLikes: 112,
        },
      ],
      lastPostAt: daysAgo(0),
      totalFollowers: 29500,
    },
  },
  {
    ein: "82-1410597",
    name: "Salmon Recovery Alliance",
    composite: 0.84,
    components: { freshness: 0.78, impactRecency: 0.9, donorMatch: 0.85, compliance: 1.0 },
    verdict: "verified",
    onePager:
      "Salmon Recovery Alliance pairs strong policy work with measurable habitat outcomes. Recent posts highlight restored creek corridors and 2026 monitoring data. Compliance is fully verified; freshness is solid though slightly older than the leader.",
    social: {
      byChannel: [
        {
          channel: "facebook",
          available: true,
          followers: 8900,
          postsInWindow: 6,
          lastPostAt: daysAgo(9),
          avgLikes: 96,
        },
        {
          channel: "linkedin",
          available: true,
          followers: 1100,
          postsInWindow: 4,
          lastPostAt: daysAgo(12),
          avgLikes: 22,
        },
        {
          channel: "instagram",
          available: false,
          followers: null,
          postsInWindow: 0,
          lastPostAt: null,
          avgLikes: null,
        },
        {
          channel: "x",
          available: false,
          followers: null,
          postsInWindow: 0,
          lastPostAt: null,
          avgLikes: null,
        },
      ],
      lastPostAt: daysAgo(9),
      totalFollowers: 10000,
    },
  },
  {
    ein: "47-2810655",
    name: "Sound Cities Climate Collaborative",
    composite: 0.79,
    components: { freshness: 0.65, impactRecency: 0.82, donorMatch: 0.94, compliance: 1.0 },
    verdict: "verified",
    onePager:
      "Sound Cities Climate Collaborative scores highest on alignment with the criteria's urban-resilience framing. Compliance is verified and the impact track record is strong, though their public reporting cadence is a notch behind the top two.",
    social: {
      byChannel: [
        {
          channel: "instagram",
          available: true,
          followers: 3300,
          postsInWindow: 7,
          lastPostAt: daysAgo(24),
          avgLikes: 128,
        },
        {
          channel: "x",
          available: true,
          followers: 940,
          postsInWindow: 3,
          lastPostAt: daysAgo(31),
          avgLikes: 6,
        },
        {
          channel: "linkedin",
          available: false,
          followers: null,
          postsInWindow: 0,
          lastPostAt: null,
          avgLikes: null,
        },
        {
          channel: "facebook",
          available: false,
          followers: null,
          postsInWindow: 0,
          lastPostAt: null,
          avgLikes: null,
        },
      ],
      lastPostAt: daysAgo(24),
      totalFollowers: 4240,
    },
  },
];

const SUPPORTING: SampleCandidate = {
  ein: "20-7491022",
  name: "Riverkeeper North",
  composite: 0.62,
  components: { freshness: 0.45, impactRecency: 0.6, donorMatch: 0.75, compliance: 0.6 },
  verdict: "partial",
  onePager: "",
  social: null,
};

// Mirrors the real report's `labelForRank` (ReportBrief.tsx): rank 2/3 get
// editorial labels, rank 4+ (the "Other candidates" card below) is "Alternate".
const RANK_LABEL = ["Lead", "Runner-up", "Third look", "Alternate"];

export function SampleReportPreview() {
  return (
    <div className="rounded-sf-card border border-sf-line bg-sf-elev p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className={badgeClasses("gray")}>Sample report</span>
        <span className="text-[12px] text-sf-muted">Criteria: Pacific NW climate, $25K</span>
      </div>

      <p className="mb-3 text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
        Top recommendations
      </p>
      <div className="grid grid-cols-1 gap-3">
        {TOP_THREE.map((candidate, i) => (
          <SampleCandidateCard
            candidate={candidate}
            key={candidate.ein}
            rank={i + 1}
            variant="one-pager"
          />
        ))}
      </div>

      <p className="mb-3 mt-6 text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
        Other candidates
      </p>
      <SampleCandidateCard candidate={SUPPORTING} rank={TOP_THREE.length + 1} variant="detail" />

      <p className="mt-4 text-[12px] leading-[1.55] text-sf-muted">
        This is an illustrative example. Real reports include the EIN + mailing address on every
        recommendation and a transparent scoring matrix.
      </p>
    </div>
  );
}

interface SampleCardProps {
  candidate: SampleCandidate;
  rank: number;
  variant: "one-pager" | "detail";
}

function verdictTone(verdict: SampleCandidate["verdict"]): BadgeTone {
  if (verdict === "verified") return "green";
  if (verdict === "partial") return "amber";
  return "red";
}

const SampleCandidateCard = memo(function SampleCandidateCard({
  candidate,
  rank,
  variant,
}: SampleCardProps) {
  const band = compositeBand(candidate.composite, false);
  const composite100 = Math.round(candidate.composite * 100);

  return (
    // min-w-0 lets the card shrink inside the grid (grid items default to
    // min-width:auto, which otherwise forces the wide social table to
    // overflow the narrow lg:grid-cols-3 columns).
    <article className="min-w-0 rounded-sf-card border border-sf-line bg-sf-card p-3.5">
      <RankBadge
        emphasis={rank === 1 ? "lead" : "runner-up"}
        label={RANK_LABEL[rank - 1]}
        rank={rank}
      />

      <header className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-[15px] font-bold tracking-[-0.01em] text-sf-heading">
            {candidate.name}
          </h4>
          <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-sf-muted">
            EIN {candidate.ein}
          </p>
        </div>
        <span className={badgeClasses(verdictTone(candidate.verdict))}>{candidate.verdict}</span>
      </header>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-[750] leading-none tabular-nums text-sf-heading">
          {composite100}
          <span className="ml-0.5 text-xs font-normal text-sf-muted">/100</span>
        </span>
        <span className={badgeClasses(composite100 >= 40 ? "brand" : "amber")}>{band}</span>
      </div>

      {variant === "one-pager" && candidate.onePager ? (
        <div className="mt-3">
          <OurTake text={candidate.onePager} />
        </div>
      ) : null}

      {candidate.social ? (
        <div className="mt-3 overflow-x-auto">
          <SocialPresence metrics={candidate.social} />
        </div>
      ) : null}
    </article>
  );
});
