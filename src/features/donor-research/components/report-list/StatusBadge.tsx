import type { DonorResearchReportStatus } from "@/types/donor-research";

const STATUS_LABEL: Record<DonorResearchReportStatus, string> = {
  pending: "Queued",
  running_fast: "Fast pipeline running",
  fast_complete: "Fast complete",
  enriching: "Enriching (Deep)",
  re_enriching: "Re-enriching",
  complete: "Complete",
  failed: "Failed",
};

type StatusTone = "neutral" | "progress" | "ok" | "warn";

const STATUS_TONE: Record<DonorResearchReportStatus, StatusTone> = {
  pending: "neutral",
  running_fast: "progress",
  fast_complete: "ok",
  enriching: "progress",
  re_enriching: "progress",
  complete: "ok",
  failed: "warn",
};

// Subtle: no full pill background. A colored dot anchors the tone; the
// label sits on the neutral surface. Avoids the rainbow-pill cliche and
// stays readable across whitelabel themes where the brand color shifts.
const TONE_CLASSES: Record<StatusTone, { dot: string; text: string; pulse: boolean }> = {
  neutral: { dot: "bg-muted-foreground/40", text: "text-muted-foreground", pulse: false },
  progress: { dot: "bg-brand", text: "text-brand-emphasis dark:text-brand-subtle", pulse: true },
  ok: { dot: "bg-brand-emphasis dark:bg-brand-subtle", text: "text-foreground", pulse: false },
  warn: {
    dot: "bg-amber-500 dark:bg-amber-400",
    text: "text-amber-700 dark:text-amber-300",
    pulse: false,
  },
};

/**
 * Status indicator shared by the report-list rows and the report-viewer
 * header (U13b/c, post-impeccable redesign).
 *
 * Renders as a dot + text pair rather than a solid colored pill — the
 * pill pattern reads as templated, and locks itself to a palette that
 * fights whitelabel tenant themes. The dot uses brand-* tokens for
 * tones we care about; `pulse` adds a subtle live-status indicator on
 * actively-running stages.
 */
export function StatusBadge({ status }: { status: DonorResearchReportStatus }) {
  const tone = STATUS_TONE[status];
  const { dot, text, pulse } = TONE_CLASSES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden>
        {pulse ? (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dot} opacity-60`}
          />
        ) : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}
