import { Bot, FileBadge, FileText, FolderOpen, Globe, Network } from "lucide-react";
import type { ComponentType } from "react";
import type { KnowledgeSourceKind } from "@/types/v2/knowledge-base";

interface KindStyle {
  Icon: ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
    strokeWidth?: number;
  }>;
  fg: string;
}

export const KIND_STYLES: Record<KnowledgeSourceKind, KindStyle> = {
  url: { Icon: Globe, fg: "text-sky-600 dark:text-sky-400" },
  sitemap: { Icon: Network, fg: "text-violet-600 dark:text-violet-400" },
  gdrive_file: { Icon: FileText, fg: "text-emerald-600 dark:text-emerald-400" },
  gdrive_folder: {
    Icon: FolderOpen,
    fg: "text-amber-600 dark:text-amber-400",
  },
  pdf_url: { Icon: FileBadge, fg: "text-rose-600 dark:text-rose-400" },
  agentic_site: { Icon: Bot, fg: "text-violet-600 dark:text-violet-400" },
};
