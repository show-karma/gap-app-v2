"use client";

import { Home } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import React, { useMemo } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgram } from "@/features/programs/hooks/use-program";
import { usePortfolioReport } from "@/hooks/portfolio-reports/usePortfolioReports";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { formatRunDate } from "@/utilities/portfolio-reports/period";
import { useWhitelabel } from "@/utilities/whitelabel-context";

/**
 * Human-readable labels for *static* URL path segments.
 *
 * Dynamic segments (program ids, report ids, …) are NOT listed here — they are
 * resolved to their entity name reactively (see the resolver hooks below).
 * Context-sensitive segments whose label depends on their parent (e.g. `config`)
 * are handled by {@link CONTEXTUAL_LABELS}, never this flat map, so a label can
 * never leak onto an unrelated route that happens to reuse the same segment.
 */
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
  "notification-settings": "Notification Settings",
  "knowledge-base": "Knowledge Base",
  "access-denied-messages": "Access Denied Page",
  impact: "Impact",
  "portfolio-reports": "Portfolio Reports",
};

/**
 * Labels for segments whose meaning depends on the segment immediately before
 * them. Matching is positional so the label only ever applies under the
 * intended parent (e.g. `config` reads "Configuration" only inside
 * `portfolio-reports`, never on some other `.../config` route).
 */
const CONTEXTUAL_LABELS: Record<string, { parent: string; label: string }> = {
  config: { parent: "portfolio-reports", label: "Configuration" },
};

/** A segment longer than this with no known label is treated as an opaque id. */
const ID_TRUNCATE_THRESHOLD = 20;

type CrumbState = "static" | "resolved" | "pending" | "unresolved";

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
  state: CrumbState;
}

/** Title-cases a kebab-case slug: `foo-bar` → `Foo Bar`. */
function titleizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Fallback label for an unrecognised segment (truncate opaque ids, titleize slugs). */
function fallbackLabel(segment: string): string {
  if (segment.length > ID_TRUNCATE_THRESHOLD) {
    return `${segment.slice(0, 8)}...`;
  }
  return titleizeSlug(segment);
}

interface ResolvedLabel {
  label: string;
  state: CrumbState;
}

/** Context needed to resolve a dynamic segment to its entity label. */
interface ResolutionContext {
  programId: string;
  programName: string | undefined;
  programLoading: boolean;
  reportId: string;
  reportLabel: string | undefined;
  reportLoading: boolean;
}

/**
 * Maps a dynamic id segment to a label: the resolved entity name, a pending
 * placeholder while loading, or a generic finite fallback when the id resolves
 * to nothing — never the raw id, never an endless spinner.
 */
function resolveDynamic(
  name: string | undefined,
  loading: boolean,
  genericFallback: string
): ResolvedLabel {
  if (name) return { label: name, state: "resolved" };
  if (loading) return { label: "", state: "pending" };
  return { label: genericFallback, state: "unresolved" };
}

/** Resolves a single path segment to its crumb label + state. */
function resolveSegment(
  segment: string,
  index: number,
  segments: string[],
  ctx: ResolutionContext
): ResolvedLabel {
  if (ctx.programId && segment === ctx.programId) {
    return resolveDynamic(ctx.programName, ctx.programLoading, "Program");
  }
  if (ctx.reportId && segment === ctx.reportId) {
    return resolveDynamic(ctx.reportLabel, ctx.reportLoading, "Report");
  }

  const contextual = CONTEXTUAL_LABELS[segment];
  if (contextual && segments[index - 1] === contextual.parent) {
    return { label: contextual.label, state: "static" };
  }

  const staticLabel = SEGMENT_LABELS[segment];
  if (staticLabel) return { label: staticLabel, state: "static" };

  return { label: fallbackLabel(segment), state: "static" };
}

export function ManageBreadcrumbs({ communitySlug }: { communitySlug: string }) {
  const rawPathname = usePathname();
  const params = useParams();
  const { isWhitelabel } = useWhitelabel();

  // In whitelabel mode, usePathname() returns "/manage/..." but the crumb logic
  // needs the full "/community/<slug>/manage/..." form for prefix matching.
  const communityPrefix = `/community/${communitySlug}`;
  const pathname =
    isWhitelabel && !rawPathname.startsWith(communityPrefix)
      ? `${communityPrefix}${rawPathname}`
      : rawPathname;

  // Dynamic route params come from the Next.js route (not the displayed URL), so
  // they resolve identically in whitelabel mode. Guard to primitive strings to
  // keep the useMemo deps stable and avoid render loops (React error #185).
  const programId = typeof params.programId === "string" ? params.programId : "";
  const reportId = typeof params.reportId === "string" ? params.reportId : "";

  // A fixed, unconditional set of resolver hooks — one per dynamic entity type,
  // never called inside the segment loop (that would break the rules of hooks).
  // Each is internally gated by `enabled`, so the report hook never fetches on a
  // funding page and vice-versa. These re-render when data arrives, which is
  // what makes the breadcrumb reactive (a passive cache read would get stuck on
  // the fallback if the breadcrumb mounted before the page's query resolved).
  const { program, loading: programLoading } = useProgram(programId);
  const { data: report, isLoading: reportLoading } = usePortfolioReport(communitySlug, reportId);

  // Match the editor page header character-for-character — it renders the same
  // `formatRunDate(report.runDate).label` (the canonical "header + breadcrumb"
  // label per the formatter's contract).
  const programName = program?.name;
  const reportLabel = report ? formatRunDate(report.runDate).label : undefined;

  const crumbs = useMemo((): Crumb[] => {
    const managePrefix = PAGES.ADMIN.ROOT(communitySlug);

    // Only show breadcrumbs for sub-pages, not the manage root itself.
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

    const ctx: ResolutionContext = {
      programId,
      programName,
      programLoading,
      reportId,
      reportLabel,
      reportLoading,
    };

    const result: Crumb[] = [
      { label: "Dashboard", href: managePrefix, isLast: false, state: "static" },
    ];

    let builtPath = managePrefix;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      builtPath += `/${segment}`;
      const { label, state } = resolveSegment(segment, i, segments, ctx);
      result.push({ label, href: builtPath, isLast: i === segments.length - 1, state });
    }

    return result;
  }, [
    pathname,
    communitySlug,
    programId,
    reportId,
    programName,
    programLoading,
    reportLabel,
    reportLoading,
  ]);

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>
                  <CrumbLabel crumb={crumb} />
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    href={crumb.href}
                    className="flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {index === 0 && <Home className="size-3.5" />}
                    <CrumbLabel crumb={crumb} />
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

/**
 * Renders a crumb label. While a dynamic name is still loading it shows a
 * fixed-width skeleton (stable layout, no shift when the name swaps in) and
 * exposes a loading state to assistive tech instead of announcing a raw id.
 */
function CrumbLabel({ crumb }: { crumb: Crumb }) {
  if (crumb.state === "pending") {
    return (
      <output aria-busy="true" aria-label="Loading" className="inline-flex">
        <Skeleton aria-hidden="true" className="inline-block h-4 w-24 align-middle" />
      </output>
    );
  }
  return <span title={crumb.label}>{crumb.label}</span>;
}
