"use client";

import {
  Activity,
  Bot,
  Check,
  FileText,
  Loader2,
  MousePointerClick,
  Scan,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ScanStatus } from "../types";

interface ReportGeneratingProps {
  // Shown as "Scoring {orgName}…" when we know it (the detail envelope carries
  // it), else "Scanning {url}", else a generic heading.
  readonly orgName?: string | null;
  readonly url?: string | null;
  // When the scan record is readable, its status drives which stage is active.
  // Absent (the public slug endpoint 404s until scored) → the checklist
  // auto-advances so the wait still reads as motion.
  readonly status?: ScanStatus;
}

const STAGES = [
  { icon: Bot, label: "Fetching pages as an AI agent", verb: "Reach" },
  { icon: FileText, label: "Parsing structured data", verb: "Understand" },
  { icon: Shield, label: "Cross-referencing IRS records", verb: "Trust" },
  { icon: MousePointerClick, label: "Walking the donate flow", verb: "Transact" },
  { icon: Activity, label: "Scoring liveness", verb: "Active" },
] as const;

// How many stages are complete for a given backend status. The stage at that
// index is the one in flight.
function stageForStatus(status?: ScanStatus): number | null {
  switch (status) {
    case "queued":
      return 0;
    case "running_config":
      return 1;
    case "config_complete":
      return 3;
    case "running_agent":
      return 4;
    default:
      return null;
  }
}

export function ReportGenerating({ orgName, url, status }: ReportGeneratingProps) {
  const statusStage = stageForStatus(status);
  const [autoStep, setAutoStep] = useState(0);

  // Auto-advance only when the status doesn't tell us where we are.
  useEffect(() => {
    if (statusStage !== null) return;
    const t = setInterval(() => setAutoStep((s) => (s + 1) % (STAGES.length + 1)), 1400);
    return () => clearInterval(t);
  }, [statusStage]);

  const current = statusStage ?? autoStep;
  const heading = orgName
    ? `Scoring ${orgName}…`
    : url
      ? `Scanning ${url.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
      : "Generating your report…";

  return (
    <output
      aria-busy="true"
      aria-label="Generating report"
      className="mx-auto flex max-w-xl flex-col items-center px-6 py-12 text-center sm:py-16"
    >
      <div className="relative mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-brand/15">
        <Scan className="h-8 w-8 text-brand-emphasis" aria-hidden />
        <span
          className="absolute inset-0 animate-ping rounded-[20px] border-2 border-brand"
          aria-hidden
        />
      </div>

      <h1 className="mb-1.5 text-2xl font-semibold tracking-tight text-foreground">{heading}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Reach &rarr; Understand &rarr; Trust &rarr; Transact. Usually about 40 seconds; the page
        updates on its own.
      </p>

      <ol className="flex w-full flex-col gap-1 text-left">
        {STAGES.map((stage, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = stage.icon;
          return (
            <li
              key={stage.label}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-300 ${
                active ? "bg-secondary" : ""
              } ${done || active ? "opacity-100" : "opacity-50"}`}
            >
              <div
                className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg ${
                  done ? "bg-brand text-brand-950" : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden />
                )}
              </div>
              <span className="flex-1 text-[14.5px] font-medium text-foreground">
                {stage.label}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                {stage.verb}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-7 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" aria-hidden />
        Polite crawler. Identifies itself. Never submits payment.
      </p>
    </output>
  );
}
