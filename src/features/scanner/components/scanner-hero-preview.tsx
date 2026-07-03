"use client";

import {
  BadgeCheck,
  Bot,
  CircleCheck,
  FileCode2,
  FileText,
  Heart,
  ListChecks,
  type LucideIcon,
  MousePointerClick,
  Shield,
  Wrench,
} from "lucide-react";
import { Safari } from "@/components/ui/safari";
import { BAND_BG, BAND_FG, BAR_TRACK } from "../utils/labels";
import { ScoreGauge } from "./score-gauge";

// A static "here's the payoff" teaser shown under the entry hero — a finished
// scorecard for an example org, framed in a Safari browser window. Sample data.
const SAMPLE = {
  org: "Waterkeeper Alliance",
  score: 77,
  bars: [
    { icon: Bot, name: "Agent Access", pct: 100, band: "strong" as const },
    { icon: FileText, name: "Machine-Readability", pct: 70, band: "ok" as const },
    { icon: Shield, name: "Trust & Verification", pct: 69, band: "ok" as const },
    { icon: Heart, name: "Donation-Readiness", pct: 72, band: "ok" as const },
  ],
};

// Safari screen-area geometry (from components/ui/safari.tsx constants).
const SCREEN = {
  left: `${(1 / 1203) * 100}%`,
  top: `${(52 / 753) * 100}%`,
  width: `${(1200 / 1203) * 100}%`,
  height: `${(700 / 753) * 100}%`,
};

// Floating proof-point cards that ring the browser frame — one per stage of the
// "reach → understand → trust → transact" spine, plus the fix count.
const CHIPS: ReadonlyArray<{
  readonly icon: LucideIcon;
  readonly title: string;
  readonly sub: string;
  readonly pos: string;
}> = [
  { icon: Wrench, title: "6 fixes found", sub: "worth +28 pts", pos: "-left-8 top-[9%]" },
  { icon: BadgeCheck, title: "EIN verified", sub: "IRS 501(c)(3)", pos: "-right-8 top-[7%]" },
  { icon: FileCode2, title: "llms.txt found", sub: "agent-readable", pos: "-left-10 top-[43%]" },
  { icon: Bot, title: "Polite crawler", sub: "identifies itself", pos: "-right-11 top-[46%]" },
  { icon: ListChecks, title: "25 checks run", sub: "in 38 seconds", pos: "-left-5 bottom-[9%]" },
  {
    icon: MousePointerClick,
    title: "Agent reached checkout",
    sub: "never submits payment",
    pos: "-right-6 bottom-[5%]",
  },
];

function Chip({
  icon: Icon,
  title,
  sub,
  className,
  index,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly sub: string;
  readonly className: string;
  readonly index: number;
}) {
  return (
    <div
      className={`scanner-float absolute z-30 hidden items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-xl lg:flex ${className}`}
      style={{ animationDelay: `${index * 0.6}s` }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand/15 text-brand-emphasis">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="text-left">
        <div className="text-xs font-bold leading-tight text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

export function ScannerHeroPreview() {
  return (
    <div className="relative mx-auto mt-[52px] w-full max-w-[720px]">
      <style>{`
        @keyframes scannerChipFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        .scanner-float { animation: scannerChipFloat 5s ease-in-out infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .scanner-float { animation: none; } }
      `}</style>
      <div className="relative w-full rounded-xl shadow-2xl" style={{ aspectRatio: "1203 / 753" }}>
        <Safari
          url="karmahq.xyz/s/waterkeeper-alliance"
          className="absolute inset-0 h-full w-full"
        />
        {/* the finished scorecard, filling the Safari screen area like a real page.
            z-20 lifts it above the Safari SVG frame (z-10) whose screen fill is opaque. */}
        <div className="absolute z-20 overflow-hidden rounded-b-[11px] bg-card" style={SCREEN}>
          <div className="flex h-full flex-col gap-[4%] px-[5%] py-[4.5%] text-left">
            {/* org header row */}
            <div className="flex items-center gap-2.5 border-b border-border pb-[3.5%]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-950">
                W
              </span>
              <span className="text-[15px] font-bold text-foreground">{SAMPLE.org}</span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <CircleCheck className="h-3.5 w-3.5 text-brand-emphasis" aria-hidden />
                Scan complete · 38s
              </span>
            </div>
            {/* body: gauge + bars, fills remaining height */}
            <div className="flex flex-1 flex-wrap items-center gap-8">
              <div className="flex items-center gap-4">
                <ScoreGauge score={SAMPLE.score} grade="C" size={140} />
                <div>
                  <div className="text-[26px] font-bold leading-none tracking-tight text-foreground">
                    C
                  </div>
                  <div className="mt-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-warning-700">
                    Partially ready
                  </div>
                </div>
              </div>
              <div className="flex min-w-[220px] flex-1 flex-col gap-3.5">
                {SAMPLE.bars.map((bar) => {
                  const Icon = bar.icon;
                  return (
                    <div key={bar.name}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="flex-1 text-[12.5px] font-semibold text-foreground">
                          {bar.name}
                        </span>
                        <span
                          className={`text-[12.5px] font-bold tabular-nums ${BAND_FG[bar.band]}`}
                        >
                          {bar.pct}%
                        </span>
                      </div>
                      <div className={`h-1.5 overflow-hidden rounded-full ${BAR_TRACK}`}>
                        <div
                          className={`h-full rounded-full ${BAND_BG[bar.band]}`}
                          style={{ width: `${bar.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {CHIPS.map((chip, i) => (
        <Chip
          key={chip.title}
          icon={chip.icon}
          title={chip.title}
          sub={chip.sub}
          className={chip.pos}
          index={i}
        />
      ))}
    </div>
  );
}
