import { ArrowRight, CheckCircle2, Wrench } from "lucide-react";
import pluralize from "pluralize";
import { BAND_BG, BAND_FG, BAR_TRACK, bandForScore } from "../utils/labels";
import { Reveal } from "./reveal";
import { ScoreGauge } from "./score-gauge";

// "The score moves" — proof that clearing the fix list moves the grade.
// An illustrative before -> fixes -> after triptych, mirroring what a real
// scan + re-scan produces. Static marketing copy; the numbers are a worked
// example, not live data.

interface CategoryRow {
  readonly name: string;
  readonly pct: number;
}

interface Snapshot {
  readonly score: number;
  readonly cats: readonly CategoryRow[];
}

interface AppliedFix {
  readonly title: string;
  readonly points: number;
}

const BEFORE: Snapshot = {
  score: 64,
  cats: [
    { name: "Agent Access", pct: 85 },
    { name: "Machine-Readability", pct: 55 },
    { name: "Trust & Verification", pct: 42 },
    { name: "Donation-Readiness", pct: 62 },
    { name: "Liveness", pct: 80 },
  ],
};

const AFTER: Snapshot = {
  score: 92,
  cats: [
    { name: "Agent Access", pct: 100 },
    { name: "Machine-Readability", pct: 85 },
    { name: "Trust & Verification", pct: 92 },
    { name: "Donation-Readiness", pct: 92 },
    { name: "Liveness", pct: 90 },
  ],
};

const FIXES: readonly AppliedFix[] = [
  { title: "Added a DAF giving path", points: 7 },
  { title: "Put the EIN in structured data", points: 6 },
  { title: "Linked a Candid profile", points: 5 },
  { title: "Published leadership & address", points: 4 },
  { title: "Completed Organization schema", points: 4 },
  { title: "Refreshed stale core pages", points: 2 },
];

const TOTAL_POINTS = FIXES.reduce((sum, f) => sum + f.points, 0);

// Colour a 0-100 category percentage using the shared score-band vocabulary.
function bandForPercent(pct: number) {
  return bandForScore({ pointsAwarded: pct, pointsPossible: 100 });
}

function SnapshotCard({
  label,
  snapshot,
  highlight = false,
}: {
  readonly label: string;
  readonly snapshot: Snapshot;
  readonly highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border bg-card p-6 text-center transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        highlight ? "border-brand-subtle shadow-lg" : "border-border shadow-sm"
      }`}
    >
      <div
        className={`mb-4 text-[11.5px] font-bold uppercase tracking-[0.07em] ${
          highlight ? "text-brand-emphasis" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div className="mb-[18px] flex justify-center">
        <ScoreGauge score={snapshot.score} size={148} />
      </div>
      <div className="flex flex-col gap-[9px] text-left">
        {snapshot.cats.map((cat) => {
          const band = bandForPercent(cat.pct);
          return (
            <div key={cat.name}>
              <div className="mb-1 flex justify-between">
                <span className="truncate text-xs font-semibold text-foreground-alt">
                  {cat.name}
                </span>
                <span className={`text-xs font-bold tabular-nums ${BAND_FG[band]}`}>
                  {cat.pct}%
                </span>
              </div>
              <div className={`h-[5px] overflow-hidden rounded-full ${BAR_TRACK}`}>
                <div
                  className={`h-full rounded-full ${BAND_BG[band]}`}
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// "The score moves" section for the /scanner entry page.
export function ScannerBeforeAfter() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pb-24 pt-12">
      <Reveal className="mb-10 text-center">
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-brand-emphasis">
          The score moves
        </span>
        <h2 className="mb-3 mt-2.5 text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-tight text-foreground">
          From a D to an A in one re-scan
        </h2>
        <p className="mx-auto max-w-[560px] text-[15.5px] leading-relaxed text-muted-foreground">
          Every fix in your report shows the points at stake. Clear them, re-scan, and the grade
          follows. Here's what that path looks like.
        </p>
      </Reveal>

      <div className="mx-auto grid max-w-[480px] grid-cols-1 items-center gap-6 lg:max-w-none lg:grid-cols-[1fr_300px_1fr]">
        <Reveal>
          <SnapshotCard label="First scan" snapshot={BEFORE} />
        </Reveal>

        {/* the bridge: the fixes that were applied between scans */}
        <Reveal delay={140} className="flex flex-col gap-2">
          <div className="mb-1.5 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/[0.13] px-3.5 py-1.5 text-[13px] font-bold text-brand-emphasis">
              <Wrench className="h-3.5 w-3.5" aria-hidden />
              {FIXES.length} {pluralize("fix", FIXES.length)} · +{TOTAL_POINTS}{" "}
              {pluralize("pt", TOTAL_POINTS)}
            </span>
          </div>
          {FIXES.map((fix) => (
            <div
              key={fix.title}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2.5"
            >
              <CheckCircle2
                className="h-[15px] w-[15px] shrink-0 text-brand-emphasis"
                aria-hidden
              />
              <span className="flex-1 text-[13px] font-medium leading-tight text-foreground">
                {fix.title}
              </span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-brand-emphasis">
                +{fix.points}
              </span>
            </div>
          ))}
          <div className="mt-1 text-center text-border-4">
            <ArrowRight className="mx-auto h-5 w-5 rotate-90 lg:rotate-0" aria-hidden />
          </div>
        </Reveal>

        <Reveal delay={240}>
          <SnapshotCard label="Re-scan · verified" snapshot={AFTER} highlight />
        </Reveal>
      </div>

      <p className="mt-[26px] text-center text-[12.5px] text-muted-foreground">
        Illustrative example: your fix list and points come from your own scan.
      </p>
    </section>
  );
}
