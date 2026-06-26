import { Badge } from "@/components/ui/badge";
import type { DiligenceCoarseStatus } from "@/types/diligence";

interface DiligenceStatusBadgeProps {
  status: DiligenceCoarseStatus;
}

/**
 * Pure presentational status pill. The label follows `coarseStatus` (NOT the
 * action flags, which gate the buttons). `intro_sent` always outranks the
 * diligence states because Connect is the further-along action.
 *
 * `not_requested` has no badge — callers gate on the status before mounting
 * this, but we also guard here so the component is safe to render directly.
 */
const STATUS_CONFIG: Record<
  Exclude<DiligenceCoarseStatus, "not_requested">,
  { label: string; className: string }
> = {
  in_progress: {
    label: "Questions sent",
    className: "border-border bg-muted text-muted-foreground",
  },
  answered: {
    label: "Answered",
    className: "border-brand/40 bg-brand/15 text-brand-emphasis dark:text-brand-subtle",
  },
  blocked: {
    label: "Couldn't reach",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  intro_sent: {
    label: "Intro sent",
    className: "border-brand/50 bg-brand/20 text-brand-emphasis dark:text-brand-subtle",
  },
};

export function DiligenceStatusBadge({ status }: DiligenceStatusBadgeProps) {
  if (status === "not_requested") {
    return null;
  }
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
