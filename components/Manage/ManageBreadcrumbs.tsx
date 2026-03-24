"use client";

import { Home } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { useWhitelabel } from "@/utilities/whitelabel-context";

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
  "control-center": "Control Center",
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
  const rawPathname = usePathname();
  const { isWhitelabel } = useWhitelabel();
  // In whitelabel mode, usePathname() returns "/manage/..." but the crumb logic
  // needs the full "/community/<slug>/manage/..." form for prefix matching.
  const communityPrefix = `/community/${communitySlug}`;
  const pathname =
    isWhitelabel && !rawPathname.startsWith(communityPrefix)
      ? `${communityPrefix}${rawPathname}`
      : rawPathname;

  const crumbs = useMemo((): Crumb[] => {
    const managePrefix = PAGES.ADMIN.ROOT(communitySlug);

    // Only show breadcrumbs for sub-pages, not the manage root itself
    if (
      !pathname.startsWith(managePrefix) ||
      pathname === managePrefix ||
      pathname === `${managePrefix}/`
    ) {
      return [];
    }

    const afterManage = pathname.slice(managePrefix.length + 1); // +1 for the leading /
    const segments = afterManage.split("/").filter(Boolean);

    if (segments.length === 0) return [];

    const result: Crumb[] = [{ label: "Dashboard", href: managePrefix, isLast: false }];

    let builtPath = managePrefix;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      builtPath += `/${segment}`;
      const isLast = i === segments.length - 1;

      // Use human-readable label or truncate UUIDs/IDs
      let label = SEGMENT_LABELS[segment] || segment;
      if (label.length > 20 && !SEGMENT_LABELS[segment]) {
        // Likely a programId or applicationId — show truncated
        label = `${label.slice(0, 8)}...`;
      }

      result.push({ label, href: builtPath, isLast });
    }

    return result;
  }, [pathname, communitySlug]);

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href} className="flex items-center gap-1">
                    {index === 0 && <Home className="size-3.5" />}
                    <span>{crumb.label}</span>
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
