"use client";

import { ChevronDownIcon, CpuChipIcon } from "@heroicons/react/24/outline";
import { type FC, memo, useMemo, useState } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import type {
  SimocracyEvaluationRow,
  SimocracySim,
} from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { EvaluationFeedback } from "./EvaluationFeedback";

const TOP_PAD_PCT = 10;

// Ordered blue tints, one per sim, legible in both themes.
const TINTS = ["#1e40af", "#2563eb", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"];

function formatValue(marginalValueMilli: number): string {
  return (marginalValueMilli / 1000).toFixed(2);
}

function formatDollars(dollars: number): string {
  return `$${dollars.toLocaleString()}`;
}

function simLabel(evaluation: SimocracyEvaluationRow): string {
  if (evaluation.sim.simName) return evaluation.sim.simName;
  const uri = evaluation.sim.simUri;
  return uri.length > 26 ? `…${uri.slice(-12)}` : uri;
}

interface SimGeometry {
  line: string;
  labelTopPct: number;
  firstDollarValue: string;
  relPct: number;
}

interface CouncilGeometry {
  total: number;
  mid: number;
  sims: SimGeometry[];
}

// Shared scale across every sim's curve; total value is the trapezoid area
// under the point-to-point line, relative to the council's largest.
function computeGeometry(evaluations: SimocracyEvaluationRow[]): CouncilGeometry | null {
  const withCurves = evaluations.filter((row) => row.mvf.length >= 2);
  if (withCurves.length === 0) return null;

  const sorted = withCurves.map((row) => [...row.mvf].sort((a, b) => a.dollars - b.dollars));
  const total = Math.max(...sorted.map((anchors) => anchors[anchors.length - 1].dollars));
  const peak = Math.max(...sorted.flatMap((anchors) => anchors.map((a) => a.marginalValueMilli)));
  if (total <= 0 || peak <= 0) return null;

  const x = (dollars: number) => (dollars / total) * 100;
  const y = (valueMilli: number) => 100 - (valueMilli / peak) * (100 - TOP_PAD_PCT);

  const areas = sorted.map((anchors) => {
    let area = 0;
    for (let i = 1; i < anchors.length; i += 1) {
      area +=
        ((anchors[i].dollars - anchors[i - 1].dollars) *
          (anchors[i].marginalValueMilli + anchors[i - 1].marginalValueMilli)) /
        2;
    }
    return area;
  });
  const maxArea = Math.max(...areas);

  // Nudge overlapping start-labels apart (top-down, 9% minimum separation).
  const labelTops = sorted.map((anchors) => y(anchors[0].marginalValueMilli));
  const order = labelTops.map((top, index) => ({ top, index })).sort((a, b) => a.top - b.top);
  for (let i = 1; i < order.length; i += 1) {
    if (order[i].top - order[i - 1].top < 9) {
      order[i].top = order[i - 1].top + 9;
    }
  }
  const adjustedTops: number[] = [];
  for (const entry of order) {
    adjustedTops[entry.index] = Math.min(entry.top, 94);
  }

  return {
    total,
    mid: Math.round(total / 2),
    sims: sorted.map((anchors, index) => ({
      line: anchors
        .map((a) => `${x(a.dollars).toFixed(2)},${y(a.marginalValueMilli).toFixed(2)}`)
        .join(" "),
      labelTopPct: adjustedTops[index],
      firstDollarValue: formatValue(anchors[0].marginalValueMilli),
      relPct: maxArea > 0 ? Math.round((areas[index] / maxArea) * 100) : 0,
    })),
  };
}

interface CouncilCurvesPanelProps {
  evaluations: SimocracyEvaluationRow[];
  geometry: CouncilGeometry;
}

const CouncilCurvesPanel: FC<CouncilCurvesPanelProps> = ({ evaluations, geometry }) => (
  <div className="flex flex-col items-stretch rounded-lg border border-gray-200 dark:border-gray-700 lg:flex-row">
    <div className="min-w-0 flex-1 px-5 pb-3.5 pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Marginal value</p>
        <span className="whitespace-nowrap text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
          all sims on one scale
        </span>
      </div>

      <div className="relative mt-3 h-40 border-b border-gray-200 dark:border-gray-700">
        <div className="absolute inset-x-0 top-[10%] border-t border-dashed border-gray-100 dark:border-zinc-700/60" />
        <div className="absolute inset-x-0 top-[55%] border-t border-dashed border-gray-100 dark:border-zinc-700/40" />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <polygon
            points={`${geometry.sims[0].line} 100,100 0,100`}
            fill={TINTS[0]}
            fillOpacity="0.08"
          />
          {geometry.sims.map((sim, index) => (
            <polyline
              key={evaluations[index].sim.simUri}
              points={sim.line}
              fill="none"
              stroke={TINTS[index % TINTS.length]}
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {geometry.sims.map((sim, index) => (
          <span
            key={evaluations[index].sim.simUri}
            className="absolute left-[2%] inline-flex -translate-y-1/2 items-center gap-1 bg-white px-1 text-[11px] font-medium dark:bg-zinc-800"
            style={{ top: `${sim.labelTopPct}%`, color: TINTS[index % TINTS.length] }}
          >
            <span className="h-0.5 w-2" style={{ background: TINTS[index % TINTS.length] }} />
            {simLabel(evaluations[index])}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
        <span>$0</span>
        <span>{formatDollars(geometry.mid)}</span>
        <span>{formatDollars(geometry.total)}</span>
      </div>
    </div>

    <div className="w-full shrink-0 border-t border-gray-200 px-5 pb-4 pt-4 dark:border-gray-700 lg:w-96 lg:border-l lg:border-t-0">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Where the council lands
      </p>
      <div className="mt-3 flex flex-col gap-2.5">
        {evaluations.map((evaluation, index) => (
          <div key={evaluation.sim.simUri}>
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: TINTS[index % TINTS.length] }}
              />
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {simLabel(evaluation)}
              </span>
              <span className="min-w-0 flex-1" />
              <span className="text-xs font-medium tabular-nums text-gray-700 dark:text-gray-300">
                {geometry.sims[index].relPct}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-700">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${geometry.sims[index].relPct}%`,
                  background: TINTS[index % TINTS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-gray-100 pt-3 text-[11px] text-gray-400 dark:border-zinc-700 dark:text-gray-500">
        Bars show total value under each curve, relative to the highest sim.
      </p>
    </div>
  </div>
);

export interface FeedbackContext {
  referenceNumber: string;
  runId: string;
  viewerAddresses: Set<string>;
  canGiveFeedback: (simUri: string) => boolean;
}

interface ReasoningRowProps {
  evaluation: SimocracyEvaluationRow;
  tint: string;
  firstDollarValue: string | null;
  relPct: number | null;
  isLast: boolean;
  feedback?: FeedbackContext;
}

const ReasoningRow: FC<ReasoningRowProps> = memo(function ReasoningRow({
  evaluation,
  tint,
  firstDollarValue,
  relPct,
  isLast,
  feedback,
}) {
  const [expanded, setExpanded] = useState(false);
  const [sidecarOpen, setSidecarOpen] = useState(false);
  const hasSidecar = evaluation.prompt !== null || evaluation.style !== null;
  const name = simLabel(evaluation);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 px-5 py-4 sm:flex-row sm:gap-6",
        !isLast && "border-b border-gray-100 dark:border-zinc-700"
      )}
    >
      <div className="w-full shrink-0 sm:w-52">
        <div className="flex items-center gap-2.5">
          {evaluation.sim.avatar ? (
            <ProfilePicture
              imageURL={evaluation.sim.avatar}
              name={name}
              size="32"
              className="h-8 w-8 rounded-md [image-rendering:pixelated]"
              alt=""
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-gray-400">
              <CpuChipIcon className="h-5 w-5" />
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tint }} />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
          </div>
        </div>
        {(firstDollarValue !== null || relPct !== null) && (
          <div className="mt-2.5 flex flex-col gap-1">
            {firstDollarValue !== null && (
              <div className="flex justify-between gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                <span>First dollar</span>
                <span className="font-medium tabular-nums text-gray-600 dark:text-gray-300">
                  {firstDollarValue}
                </span>
              </div>
            )}
            {relPct !== null && (
              <div className="flex justify-between gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                <span>Total value</span>
                <span className="font-medium tabular-nums text-gray-600 dark:text-gray-300">
                  {relPct}%
                </span>
              </div>
            )}
          </div>
        )}
        <code className="mt-2.5 block break-all font-mono text-[11px] leading-snug text-gray-400 dark:text-gray-500">
          {evaluation.model ?? "model not recorded"}
        </code>
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "max-w-[92ch] whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300",
            !expanded && "line-clamp-3"
          )}
        >
          {evaluation.reasoning}
        </p>
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="text-xs font-medium text-gray-500 transition-colors duration-150 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
          {hasSidecar && (
            <button
              type="button"
              onClick={() => setSidecarOpen((open) => !open)}
              aria-expanded={sidecarOpen}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors duration-150 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ChevronDownIcon
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none",
                  sidecarOpen && "rotate-180"
                )}
              />
              {sidecarOpen ? "Hide constitution & style" : "Constitution & style"}
            </button>
          )}
        </div>
        {sidecarOpen && (
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            {evaluation.prompt !== null && (
              <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/40">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  Constitution
                </p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  {evaluation.prompt}
                </p>
              </div>
            )}
            {evaluation.style !== null && (
              <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/40">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Style</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  {evaluation.style}
                </p>
              </div>
            )}
          </div>
        )}
        {feedback && (
          <EvaluationFeedback
            referenceNumber={feedback.referenceNumber}
            runId={feedback.runId}
            simUri={evaluation.sim.simUri}
            canGiveFeedback={feedback.canGiveFeedback(evaluation.sim.simUri)}
            viewerAddresses={feedback.viewerAddresses}
          />
        )}
      </div>
    </div>
  );
});

export interface CouncilEvaluationsProps {
  evaluations: SimocracyEvaluationRow[];
  /** Linked, role-authorized sims from the program summary. */
  linkedSims?: SimocracySim[];
  feedback?: FeedbackContext;
}

export const CouncilEvaluations: FC<CouncilEvaluationsProps> = ({
  evaluations,
  linkedSims,
  feedback,
}) => {
  const geometry = useMemo(() => computeGeometry(evaluations), [evaluations]);

  const respondedUris = useMemo(
    () => new Set(evaluations.map((evaluation) => evaluation.sim.simUri)),
    [evaluations]
  );
  const silentSims = (linkedSims ?? []).filter((sim) => !respondedUris.has(sim.simUri));

  const geometryBySim = useMemo(() => {
    const map = new Map<string, SimGeometry>();
    if (!geometry) return map;
    const withCurves = evaluations.filter((row) => row.mvf.length >= 2);
    withCurves.forEach((row, index) => {
      map.set(row.sim.simUri, geometry.sims[index]);
    });
    return map;
  }, [geometry, evaluations]);

  const curveEvaluations = evaluations.filter((row) => row.mvf.length >= 2);

  return (
    <div className="space-y-5">
      {geometry && <CouncilCurvesPanel evaluations={curveEvaluations} geometry={geometry} />}

      <div>
        <div className="flex items-baseline gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Reasoning</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Each sim&apos;s written judgement
          </span>
        </div>
        <div className="mt-2.5 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-zinc-800">
          {evaluations.map((evaluation, index) => {
            const geo = geometryBySim.get(evaluation.sim.simUri);
            const curveIndex = curveEvaluations.indexOf(evaluation);
            return (
              <ReasoningRow
                key={evaluation.sim.simUri}
                evaluation={evaluation}
                tint={curveIndex >= 0 ? TINTS[curveIndex % TINTS.length] : "#9ca3af"}
                firstDollarValue={geo?.firstDollarValue ?? null}
                relPct={geo?.relPct ?? null}
                isLast={index === evaluations.length - 1 && silentSims.length === 0}
                feedback={feedback}
              />
            );
          })}
          {silentSims.map((sim, index) => (
            <div
              key={sim.simUri}
              className={cn(
                "flex items-center gap-2.5 rounded-b-lg bg-gray-50 px-5 py-3 dark:bg-zinc-900/40",
                index === 0 && "border-t border-gray-100 dark:border-zinc-700"
              )}
            >
              {sim.avatar ? (
                <ProfilePicture
                  imageURL={sim.avatar}
                  name={sim.simName ?? sim.simUri}
                  size="24"
                  className="h-6 w-6 rounded-md opacity-60 [image-rendering:pixelated]"
                  alt=""
                />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-400 dark:bg-zinc-700 dark:text-gray-500">
                  <CpuChipIcon className="h-4 w-4" />
                </span>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {sim.simName ?? sim.simUri}
                </span>{" "}
                returned no evaluation in this run.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
