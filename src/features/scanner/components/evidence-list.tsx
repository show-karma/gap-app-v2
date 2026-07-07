import { AlertTriangle, CircleCheck, type LucideIcon, Minus, XCircle } from "lucide-react";
import pluralize from "pluralize";
import type { CheckEvidence } from "../types";

const STATUS: Record<
  CheckEvidence["status"],
  { icon: LucideIcon; iconClass: string; label: string; pointClass: string }
> = {
  pass: {
    icon: CircleCheck,
    iconClass: "text-brand-emphasis",
    label: "Pass",
    pointClass: "text-brand-emphasis",
  },
  partial: {
    icon: AlertTriangle,
    iconClass: "text-warning-700",
    label: "Partial",
    pointClass: "text-warning-700",
  },
  fail: {
    icon: XCircle,
    iconClass: "text-destructive",
    label: "Fail",
    pointClass: "text-destructive",
  },
  not_attempted: {
    icon: Minus,
    iconClass: "text-muted-foreground",
    label: "Not attempted",
    pointClass: "text-muted-foreground",
  },
  error: {
    icon: XCircle,
    iconClass: "text-destructive",
    label: "Check error",
    pointClass: "text-destructive",
  },
};

const ACRONYMS = new Set([
  "ein",
  "irs",
  "daf",
  "tls",
  "og",
  "https",
  "http",
  "url",
  "js",
  "rss",
  "hsts",
  "api",
  "mcp",
]);

// Turns a checkId like "ein_irs_cross_reference" into "EIN IRS cross reference".
function humanizeCheckId(id: string): string {
  return id
    .split(/[_-]/)
    .map((word, i) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : i === 0
          ? word.charAt(0).toUpperCase() + word.slice(1)
          : word
    )
    .join(" ");
}

interface EvidenceListProps {
  readonly evidence: readonly CheckEvidence[];
}

export function EvidenceList({ evidence }: EvidenceListProps) {
  if (evidence.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Evidence{" "}
        <span className="text-base font-normal text-muted-foreground">
          · {evidence.length} {pluralize("check", evidence.length)}
        </span>
      </h2>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {evidence.map((check, i) => {
          const status = STATUS[check.status];
          const Icon = status.icon;
          return (
            <div
              key={check.checkId}
              className={`flex items-start gap-3 px-4 py-3 ${i ? "border-t border-border" : ""}`}
            >
              <Icon
                className={`mt-0.5 h-[17px] w-[17px] shrink-0 ${status.iconClass}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {humanizeCheckId(check.checkId)}
                  </span>
                  <code className="rounded bg-secondary px-1.5 py-px font-mono text-[11px] text-muted-foreground">
                    {check.checkId}
                  </code>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                  {check.summary}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-[13px] font-bold tabular-nums ${status.pointClass}`}>
                  {check.pointsPossible ? `${check.pointsAwarded}/${check.pointsPossible}` : "—"}
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted-foreground">{status.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
