"use client";

import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/utilities/tailwind";

/** Human-readable labels for URL path segments */
const SEGMENT_LABELS: Record<string, string> = {
  manage: "Dashboard",
  "funding-platform": "Funding Platform",
  applications: "Applications",
  "question-builder": "Form Builder",
  setup: "Setup",
  milestones: "Milestones",
  "milestones-report": "Milestones",
  "edit-categories": "Categories",
  "edit-projects": "Projects",
  "manage-indicators": "Impact Measurement",
  tracks: "Tracks",
  payouts: "Payouts",
  "program-scores": "Program Scores",
  "kyc-settings": "KYC/KYB Settings",
  impact: "Impact",
};

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

export function ManageBreadcrumbs({ communitySlug }: { communitySlug: string }) {
  const pathname = usePathname();

  const crumbs = useMemo((): Crumb[] => {
    const managePrefix = `/community/${communitySlug}/manage`;

    // Only show breadcrumbs for sub-pages, not the manage root itself
    if (!pathname.startsWith(managePrefix) || pathname === managePrefix || pathname === `${managePrefix}/`) {
      return [];
    }

    const afterManage = pathname.slice(managePrefix.length + 1); // +1 for the leading /
    const segments = afterManage.split("/").filter(Boolean);

    if (segments.length === 0) return [];

    const result: Crumb[] = [
      { label: "Dashboard", href: managePrefix, isLast: false },
    ];

    let builtPath = managePrefix;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      builtPath += `/${segment}`;
      const isLast = i === segments.length - 1;

      // Use human-readable label or truncate UUIDs/IDs
      let label = SEGMENT_LABELS[segment] || segment;
      if (label.length > 20 && !SEGMENT_LABELS[segment]) {
        // Likely a programId or applicationId - show truncated
        label = `${label.slice(0, 8)}...`;
      }

      result.push({ label, href: builtPath, isLast });
    }

    return result;
  }, [pathname, communitySlug]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm mb-4 min-w-0">
      {crumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-1 min-w-0">
          {index > 0 && (
            <ChevronRightIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
          )}
          {crumb.isLast ? (
            <span className="text-gray-900 dark:text-white font-medium truncate">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className={cn(
                "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors truncate",
                index === 0 && "flex items-center gap-1"
              )}
            >
              {index === 0 && <HomeIcon className="w-3.5 h-3.5 flex-shrink-0" />}
              <span>{crumb.label}</span>
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
