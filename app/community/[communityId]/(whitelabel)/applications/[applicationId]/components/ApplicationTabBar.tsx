"use client";

import { CheckCircle2, FileText, Lock, type LucideIcon, MessageSquare, Target } from "lucide-react";
import { cn } from "@/utilities/tailwind";

export type ApplicationTabKey = "details" | "milestones" | "post-approval" | "comments" | "notes";

export interface TabDescriptor {
  key: ApplicationTabKey;
  label: string;
  Icon: LucideIcon;
  count?: number;
}

interface ApplicationTabBarProps {
  tabs: TabDescriptor[];
  activeTab: ApplicationTabKey;
  onTabChange: (tab: ApplicationTabKey) => void;
}

export function ApplicationTabBar({ tabs, activeTab, onTabChange }: ApplicationTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Application sections"
      className="flex w-max max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5 shadow-sm"
    >
      {tabs.map(({ key, label, Icon, count }) => {
        const isActive = key === activeTab;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(key)}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-[rgb(var(--color-primary))] text-brand-950 shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-[15px] w-[15px]" />
            {label}
            {typeof count === "number" && count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] font-semibold",
                  isActive ? "bg-brand-950/15 text-brand-950" : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const TAB_ICONS = {
  details: FileText,
  milestones: Target,
  "post-approval": CheckCircle2,
  comments: MessageSquare,
  notes: Lock,
} satisfies Record<ApplicationTabKey, LucideIcon>;
