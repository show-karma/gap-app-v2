import { CheckCircle2, FileText, Lock, type LucideIcon, MessageSquare, Target } from "lucide-react";
import type { ApplicationTabKey } from "./ApplicationTabBar";

export const TAB_ICONS = {
  details: FileText,
  milestones: Target,
  "post-approval": CheckCircle2,
  comments: MessageSquare,
  notes: Lock,
} satisfies Record<ApplicationTabKey, LucideIcon>;
