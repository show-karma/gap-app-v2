import { CheckCircle2, FileText, type LucideIcon, MessageSquare, Target } from "lucide-react";
import type { ApplicationTabKey } from "./ApplicationTabBar";

export const TAB_ICONS = {
  details: FileText,
  milestones: Target,
  "post-approval": CheckCircle2,
  comments: MessageSquare,
} satisfies Record<ApplicationTabKey, LucideIcon>;
