/**
 * Sample report fixture used in the onboarding flow (F4).
 *
 * Renders a hard-coded illustrative report so the advisor sees what
 * they'll get before they commit to onboarding. Shape mirrors a real
 * report brief: top-3 one-pager cards + a full-list row, all built from
 * inline fixture data. No API calls.
 *
 * Intentionally not connected to PAGES or any real candidate — this is
 * marketing-shape content.
 */

import { compositeBand } from "../report-brief/scoring";

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
  },
  {
    ein: "82-1410597",
    name: "Salmon Recovery Alliance",
    composite: 0.84,
    components: { freshness: 0.78, impactRecency: 0.9, donorMatch: 0.85, compliance: 1.0 },
    verdict: "verified",
    onePager:
      "Salmon Recovery Alliance pairs strong policy work with measurable habitat outcomes. Recent posts highlight restored creek corridors and 2026 monitoring data. Compliance is fully verified; freshness is solid though slightly older than the leader.",
  },
  {
    ein: "47-2810655",
    name: "Sound Cities Climate Collaborative",
    composite: 0.79,
    components: { freshness: 0.65, impactRecency: 0.82, donorMatch: 0.94, compliance: 1.0 },
    verdict: "verified",
    onePager:
      "Sound Cities Climate Collaborative scores highest on alignment with the criteria's urban-resilience framing. Compliance is verified and the impact track record is strong, though their public reporting cadence is a notch behind the top two.",
  },
];

const SUPPORTING: SampleCandidate = {
  ein: "20-7491022",
  name: "Riverkeeper North",
  composite: 0.62,
  components: { freshness: 0.45, impactRecency: 0.6, donorMatch: 0.75, compliance: 0.6 },
  verdict: "partial",
  onePager: "",
};

export function SampleReportPreview() {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Sample report
        </p>
        <p className="text-xs text-muted-foreground">Criteria: Pacific NW climate, $25K</p>
      </div>

      <h3 className="mb-3 text-sm font-semibold text-foreground">Top recommendations</h3>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {TOP_THREE.map((candidate) => (
          <SampleCandidateCard key={candidate.ein} candidate={candidate} variant="one-pager" />
        ))}
      </div>

      <h3 className="mb-3 mt-6 text-sm font-semibold text-foreground">Other candidates</h3>
      <SampleCandidateCard candidate={SUPPORTING} variant="detail" />

      <p className="mt-4 text-xs text-muted-foreground">
        This is an illustrative example. Real reports include the EIN + mailing address on every
        recommendation and a transparent scoring matrix.
      </p>
    </div>
  );
}

interface SampleCardProps {
  candidate: SampleCandidate;
  variant: "one-pager" | "detail";
}

function SampleCandidateCard({ candidate, variant }: SampleCardProps) {
  const band = compositeBand(candidate.composite, false);
  return (
    <article className="rounded-lg border border-border bg-card p-3">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold">{candidate.name}</h4>
          <p className="text-xs text-muted-foreground">
            EIN {candidate.ein} · Verdict: <span className="capitalize">{candidate.verdict}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-emphasis dark:text-brand-subtle">
            {band}
          </p>
          <p className="font-mono text-lg leading-none tabular-nums">
            {Math.round(candidate.composite * 100)}
            <span className="text-xs text-muted-foreground">{" / 100"}</span>
          </p>
        </div>
      </header>
      {variant === "one-pager" && candidate.onePager ? (
        <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs">{candidate.onePager}</p>
      ) : null}
    </article>
  );
}
