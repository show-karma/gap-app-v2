import {
  CheckCircle2,
  Clock,
  Eye,
  FileQuestion,
  FileText,
  type LucideIcon,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { formatApplicationStatus } from "@/utilities/application-status";

/**
 * Single source of truth for how an application status is rendered across the
 * application page surfaces (header pill, sidebar stepper, next-step card).
 * Keeps colors/icons/labels consistent and avoids duplicating the switch
 * statements that previously lived in three different components.
 */

interface StatusVisual {
  label: string;
  Icon: LucideIcon;
  /** Soft badge/pill: tinted background + readable text (light + dark). */
  pillClass: string;
  /** Solid dot used inside the header pill. */
  dotClass: string;
}

const DEFAULT_VISUAL: StatusVisual = {
  label: "Unknown",
  Icon: Clock,
  pillClass: "bg-muted text-muted-foreground",
  dotClass: "bg-zinc-400",
};

const STATUS_VISUALS: Record<string, StatusVisual> = {
  draft: {
    label: "Draft",
    Icon: FileText,
    pillClass: "bg-muted text-muted-foreground",
    dotClass: "bg-zinc-400",
  },
  pending: {
    label: "Pending",
    Icon: Clock,
    pillClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    dotClass: "bg-yellow-500",
  },
  under_review: {
    // Karma brand teal — matches ApplicationStatusChip's primary treatment
    // for in-review (not a stray blue).
    label: "Under Review",
    Icon: Eye,
    pillClass: "bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary-dark))]",
    dotClass: "bg-[rgb(var(--color-primary))]",
  },
  revision_requested: {
    // Neutral/secondary — matches ApplicationStatusChip (not a stray orange).
    label: "Revision Requested",
    Icon: FileQuestion,
    pillClass: "bg-secondary text-secondary-foreground",
    dotClass: "bg-muted-foreground",
  },
  resubmitted: {
    label: "Resubmitted",
    Icon: RefreshCw,
    pillClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    dotClass: "bg-yellow-500",
  },
  approved: {
    label: "Approved",
    Icon: CheckCircle2,
    pillClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    dotClass: "bg-green-500",
  },
  rejected: {
    label: "Declined",
    Icon: XCircle,
    pillClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    dotClass: "bg-red-500",
  },
};

export function getStatusVisual(status: string): StatusVisual {
  const normalized = status?.toLowerCase().replace(/-/g, "_");
  const visual = STATUS_VISUALS[normalized];
  if (visual) return visual;
  return {
    ...DEFAULT_VISUAL,
    label: formatApplicationStatus(status ?? "") || DEFAULT_VISUAL.label,
  };
}
