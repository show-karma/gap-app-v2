"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { cn } from "@/utilities/tailwind";

interface ProgramSetupStatusProps {
  programId: string;
  communityId: string;
  hasFormFields: boolean;
  isEnabled: boolean;
  className?: string;
}

type SetupStatus = "complete" | "needs-setup" | "ready-to-enable";

function getSetupStatus(hasFormFields: boolean, isEnabled: boolean): SetupStatus {
  if (isEnabled) {
    return "complete";
  }
  if (hasFormFields) {
    return "ready-to-enable";
  }
  return "needs-setup";
}

export function ProgramSetupStatus({
  programId,
  communityId,
  hasFormFields,
  isEnabled,
  className,
}: ProgramSetupStatusProps) {
  const status = getSetupStatus(hasFormFields, isEnabled);

  const setupUrl = `/community/${communityId}/admin/funding-platform/${programId}/setup`;

  if (status === "complete") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
          className
        )}
      >
        <CheckCircleIcon className="w-3.5 h-3.5" />
        <span>Live</span>
      </div>
    );
  }

  if (status === "ready-to-enable") {
    return (
      <Link href={setupUrl}>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer",
            "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
            "hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors",
            className
          )}
        >
          <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
          <span>Ready to Enable</span>
        </div>
      </Link>
    );
  }

  // needs-setup
  return (
    <Link href={setupUrl}>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer",
          "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
          "hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors",
          className
        )}
      >
        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
        <span>Setup Required</span>
      </div>
    </Link>
  );
}

/**
 * Determines if a program has its form configured
 * by checking the applicationConfig formSchema fields
 */
export function hasFormConfigured(
  applicationConfig: { formSchema?: { fields?: unknown[] } } | null | undefined
): boolean {
  return Boolean(
    applicationConfig?.formSchema?.fields && applicationConfig.formSchema.fields.length > 0
  );
}
