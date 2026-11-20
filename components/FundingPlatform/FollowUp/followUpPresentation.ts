import {
  Bell,
  BellOff,
  CheckCircle2,
  CircleDot,
  FilePen,
  Flag,
  type LucideIcon,
  MessageCircleQuestion,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";

export type FollowUpTone = "neutral" | "brand" | "success" | "attention" | "muted";

interface KindPresentation {
  readonly label: string;
  readonly Icon: LucideIcon;
  readonly tone: FollowUpTone;
}

const KIND_PRESENTATION: Record<string, KindPresentation> = {
  event: { label: "Update", Icon: CircleDot, tone: "neutral" },
  step: { label: "Assistant", Icon: Sparkles, tone: "brand" },
  message_queued: { label: "Message sent", Icon: Send, tone: "brand" },
  timer_set: { label: "Reminder scheduled", Icon: Bell, tone: "muted" },
  timer_cancelled: { label: "Reminder cancelled", Icon: BellOff, tone: "muted" },
  verdict_submitted: { label: "Draft saved", Icon: FilePen, tone: "neutral" },
  verdict_published: { label: "Published", Icon: CheckCircle2, tone: "success" },
  verdict_dismissed: { label: "Set aside", Icon: XCircle, tone: "muted" },
  escalated: { label: "Needs you", Icon: MessageCircleQuestion, tone: "attention" },
  stage_changed: { label: "Status", Icon: Flag, tone: "neutral" },
};

const FALLBACK: KindPresentation = { label: "Update", Icon: CircleDot, tone: "neutral" };

export function presentKind(kind: string): KindPresentation {
  return KIND_PRESENTATION[kind] ?? FALLBACK;
}

export const TONE_CLASSES: Record<FollowUpTone, { dot: string; label: string }> = {
  neutral: { dot: "bg-muted text-foreground", label: "text-muted-foreground" },
  brand: { dot: "bg-primary/10 text-primary", label: "text-primary" },
  success: {
    dot: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "text-emerald-700 dark:text-emerald-300",
  },
  attention: {
    dot: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    label: "text-amber-700 dark:text-amber-300",
  },
  muted: { dot: "bg-muted text-muted-foreground", label: "text-muted-foreground" },
};

const STAGE_LABELS: Record<string, string> = {
  new: "Starting",
  awaiting_review: "Waiting on reviewer",
  waiting_operator: "Needs you",
};

export function stageLabel(stage: string, closed: boolean): string {
  if (closed) return "Done";
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export type FollowUpView = "all" | "attention" | "active" | "closed";

export const FOLLOW_UP_VIEWS: ReadonlyArray<{ value: FollowUpView; label: string }> = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs you" },
  { value: "active", label: "In progress" },
  { value: "closed", label: "Done" },
];
