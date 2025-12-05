import { EyeIcon, ShieldCheckIcon, UserIcon } from "@heroicons/react/24/outline";
import type { ComponentType } from "react";

export type EditType = "applicant" | "admin" | "reviewer";

export interface EditTypeConfig {
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  badgeVariant: "secondary";
  badgeClassName: string;
}

export const editTypeConfig: Record<EditType, EditTypeConfig> = {
  applicant: {
    label: "Applicant",
    icon: UserIcon,
    color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    badgeVariant: "secondary",
    badgeClassName: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheckIcon,
    color: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
    badgeVariant: "secondary",
    badgeClassName: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  },
  reviewer: {
    label: "Reviewer",
    icon: EyeIcon,
    color: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300",
    badgeVariant: "secondary",
    badgeClassName: "bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300",
  },
} as const;
