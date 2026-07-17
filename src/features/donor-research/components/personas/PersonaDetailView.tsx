"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import pluralize from "pluralize";
import type React from "react";
import { memo, useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, SkeletonList } from "@/components/Pages/Dashboard/v3/primitives";
import { SK } from "@/components/Pages/Dashboard/v3/soft-classes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDonorHandle } from "@/hooks/useDonorHandles";
import { useDonorReports } from "@/hooks/useDonorReports";
import { Link } from "@/src/components/navigation/Link";
import type { ResearchReportListItem } from "@/types/donor-research";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { HandleNotesSection } from "../donor-detail/HandleNotesSection";
import { StatusBadge } from "../report-list/StatusBadge";

// Keep the persona editor (narrative pane, refine, structured chips) out of
// the section's initial bundle — same posture as the old creation modal.
const PersonaEditor = dynamic(
  () => import("../donor-detail/PersonaEditor").then((m) => m.PersonaEditor),
  {
    ssr: false,
    loading: () => (
      <div aria-busy="true" className="flex flex-col gap-4">
        <div className="h-32 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
      </div>
    ),
  }
);

function DetailCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-sf-card border border-sf-line bg-sf-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-[3px]">
          <h2 className="m-0 text-[15px] font-[650] tracking-[-0.01em] text-sf-heading">{title}</h2>
          {description ? <p className="m-0 text-[13px] text-sf-muted">{description}</p> : null}
        </div>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

const PersonaReportRow = memo(function PersonaReportRow({
  report,
}: {
  report: ResearchReportListItem;
}) {
  const finishedAt = report.completedAt ?? report.fastCompletedAt ?? null;
  const headline =
    report.criteriaSummary && report.criteriaSummary.length > 0
      ? report.criteriaSummary
      : `${report.mode === "deep" ? "Deep" : "Fast"} report`;
  const href = PAGES.DONOR_RESEARCH.REPORT(report.id);
  return (
    <li className="[&+&]:border-t [&+&]:border-sf-line">
      {/* No onClick guard here — `PersonaDetailView`'s document-level
          capture-phase listener intercepts this (and every other same-origin
          link on the page) while the persona editor is dirty. */}
      <Link
        className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-sf-elev"
        href={href}
      >
        <StatusBadge status={report.status} />
        <p className="truncate text-[13px] font-[600] text-sf-heading">{headline}</p>
        <p className="truncate text-[11.5px] text-sf-muted">
          {finishedAt ? (
            <>Finished {renderRelativeTime(finishedAt)}</>
          ) : (
            <>Started {renderRelativeTime(report.createdAt)}</>
          )}
        </p>
      </Link>
    </li>
  );
});
PersonaReportRow.displayName = "PersonaReportRow";

interface ReportsCardProps {
  handleId: string;
  /** Guard for the empty-state CTA — a button (no native href for
   * `PersonaDetailView`'s document-level capture listener to intercept), so
   * it pushes the route itself once clear (or defers to the discard-confirm
   * dialog while dirty). */
  onGuardedPush: (href: string) => void;
}

/** Side "Reports" card — reports scoped to this persona, via the existing
 * `useDonorReports({ donorHandleId })` filter. Three states honored. */
function ReportsCard({ handleId, onGuardedPush }: ReportsCardProps) {
  const reportsQuery = useDonorReports({ limit: 25, donorHandleId: handleId });
  const newReportHref = `${PAGES.DONOR_RESEARCH.NEW}?handle=${handleId}`;

  let body: React.ReactNode;
  if (reportsQuery.isLoading) {
    body = <SkeletonList count={2} />;
  } else if (reportsQuery.isError) {
    body = (
      <ErrorState
        message={
          (reportsQuery.error as Error)?.message || "Couldn't load reports for this persona."
        }
        onRetry={() => reportsQuery.refetch()}
      />
    );
  } else {
    const reports = reportsQuery.data?.items ?? [];
    if (reports.length === 0) {
      body = (
        <EmptyState
          body="Start a research report scoped to this persona."
          icon="compass"
          primary={{
            label: "New report",
            icon: "plus",
            onClick: () => onGuardedPush(newReportHref),
          }}
          title="No reports for this persona yet"
        />
      );
    } else {
      // `useDonorReports` is capped at `limit` — when the persona has exactly
      // that many (or more) results, `reports.length` is the page size, not
      // the true total, so the copy must not assert a total count.
      const atLimit = reports.length >= (reportsQuery.data?.limit ?? 25);
      body = (
        <>
          <p className="m-0 text-[12px] text-sf-muted">
            {atLimit
              ? `Showing latest ${reports.length} ${pluralize("report", reports.length)}`
              : `${reports.length} ${pluralize("report", reports.length)}`}
          </p>
          <ul className="flex flex-col overflow-hidden rounded-sf-tile border border-sf-line bg-sf-card">
            {reports.map((report) => (
              <PersonaReportRow key={report.id} report={report} />
            ))}
          </ul>
        </>
      );
    }
  }

  return (
    <DetailCard
      action={
        // No onClick guard here — see the comment on `PersonaReportRow`.
        <Link
          className="text-[12.5px] font-medium text-sf-heading underline underline-offset-2 hover:no-underline"
          href={newReportHref}
        >
          New report for this persona
        </Link>
      }
      title="Reports"
    >
      {body}
    </DetailCard>
  );
}

function PersonaDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className={cn(SK, "h-8 w-64")} />
      <div className="grid gap-6 lg:[grid-template-columns:minmax(0,3fr)_minmax(18rem,2fr)]">
        <div className={cn(SK, "h-[420px] w-full rounded-sf-card")} />
        <div className="flex flex-col gap-6">
          <div className={cn(SK, "h-[160px] w-full rounded-sf-card")} />
          <div className={cn(SK, "h-[220px] w-full rounded-sf-card")} />
        </div>
      </div>
    </div>
  );
}

/**
 * Resolves a `document`-level click into the same-origin href it would
 * navigate to, or `null` if the click shouldn't be guarded (modifier/middle
 * click, not a link, opens elsewhere, cross-origin, or an in-page anchor).
 * Pulled out of `PersonaDetailView`'s capture-phase listener so the listener
 * itself stays simple — this is the only part with real branching.
 */
function resolveGuardedNavigationHref(event: MouseEvent): string | null {
  if (event.defaultPrevented) return null;
  // Modifier/middle/right clicks open in a new tab (or a context menu) —
  // that loses no state, so let the browser handle it natively instead of
  // hijacking it into the discard-confirm dialog.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return null;
  }
  const target = event.target as HTMLElement | null;
  const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
  if (!anchor) return null;
  // Links that open elsewhere (new tab/window) or trigger a download don't
  // discard the draft — leave them to the browser.
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  const samePage =
    url.pathname === window.location.pathname && url.search === window.location.search;
  if (samePage && url.hash) return null; // in-page anchor, not a navigation away
  return `${url.pathname}${url.search}${url.hash}`;
}

interface PersonaDetailViewProps {
  handleId: string;
}

/**
 * Persona detail page (redesign P2, spec 2.3 "Persona detail"). Page heading,
 * then a two-column layout: main = the existing `PersonaEditor`
 * hosted inline (refine/accept/reject/chips/save/rate-limit behavior
 * unchanged), side = the existing `HandleNotesSection` + a `Reports` card
 * filtered to this persona.
 *
 * The handle fetch (`useDonorHandle`) throws its error to the route's
 * `error.tsx` boundary on failure — the same posture `ReportBriefView`
 * already uses for a single-resource-by-id fetch (a missing/foreign handle
 * id surfaces as an error there too, not a distinct "empty" state).
 *
 * §1.2 MUST-preserve: the old creation modal routed every dismissal through
 * a `requestClose()` gate and confirmed "Discard profile changes?" while the
 * persona had unsaved edits (including an undecided Refine suggestion, which
 * consumed a rate-limited LLM call). Hosting `PersonaEditor` standalone here
 * loses that guard unless it's rewired at this level: `onDirtyChange` feeds
 * `personaDirty`, which then gates (a) a `beforeunload` handler for
 * reload/close/external navigation and (b) an in-app confirm — reusing the
 * same Dialog pattern.
 *
 * The confirm is wired via a capture-phase `click` listener on `document`,
 * not per-link `onClick` props, because this page is always hosted inside
 * `DonorResearchShell` (sticky rail: Reports / Personas / Diligence questions
 * / a persistent "New report" CTA) and under the global navbar — neither of
 * which this component renders or controls, so there's no prop to attach a
 * guard to. A document-level listener catches a plain left-click on *any*
 * same-origin `<a>` on the page while dirty, wherever it's rendered.
 * Modifier/middle clicks (open in a new tab) are left alone since they don't
 * lose the draft. The one exception is the Reports-card empty-state "New
 * report" CTA, a `<button>` with no native `href` for the listener to
 * intercept — it defers to `guardedPush` instead.
 */
export function PersonaDetailView({ handleId }: PersonaDetailViewProps) {
  const router = useRouter();
  const handleQuery = useDonorHandle(handleId);
  const [personaDirty, setPersonaDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const onPersonaDirtyChange = useCallback((dirty: boolean) => setPersonaDirty(dirty), []);

  useEffect(() => {
    if (!personaDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy requirement for the confirmation prompt to appear in some
      // browsers.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [personaDirty]);

  // §1.2 MUST-preserve, full coverage: while the persona is dirty, intercept
  // every same-origin left-click navigation on the page — not just the links
  // this component renders, but the always-visible `DonorResearchShell` rail
  // and the global navbar, neither of which this component controls. Capture
  // phase runs before `next/link`'s own click handler, so `preventDefault()`
  // here reliably cancels the client-side navigation: `next/link` bails out
  // of its own navigation when `event.defaultPrevented` is already true.
  useEffect(() => {
    if (!personaDirty) return;
    const onDocumentClick = (event: MouseEvent) => {
      const href = resolveGuardedNavigationHref(event);
      if (!href) return;
      event.preventDefault();
      setPendingHref(href);
    };
    // Capture phase: run before the shell rail's / navbar's own click
    // handlers so the navigation is cancelled before it starts.
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [personaDirty]);

  /** Guard for button-triggered navigation (no native `<a href>` for the
   * capture-phase listener above to intercept) — the Reports-card
   * empty-state "New report" CTA pushes the route itself once clear. */
  const guardedPush = useCallback(
    (href: string) => {
      if (personaDirty) {
        setPendingHref(href);
        return;
      }
      router.push(href);
    },
    [personaDirty, router]
  );

  const discardAndNavigate = () => {
    const href = pendingHref;
    setPendingHref(null);
    setPersonaDirty(false);
    if (href) router.push(href);
  };

  if (handleQuery.isLoading) {
    return <PersonaDetailSkeleton />;
  }

  if (handleQuery.isError) {
    throw handleQuery.error;
  }

  const handle = handleQuery.data!;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-sf-heading">
          {handle.opaqueLabel}
        </h1>
        <p className="mt-1 text-[13.5px] text-sf-muted">Persona profile</p>
      </div>

      <div
        className="grid gap-6 lg:[grid-template-columns:minmax(0,3fr)_minmax(18rem,2fr)]"
        data-persona-detail-columns
      >
        <DetailCard
          description="Refine writes a recommended persona into the field below — accept or reject it, then save."
          title="Research profile"
        >
          <PersonaEditor handleId={handleId} onDirtyChange={onPersonaDirtyChange} />
        </DetailCard>

        <div className="flex flex-col gap-6">
          {/* HandleNotesSection renders its own heading — no DetailCard title
              wrapper here, just the card surface. */}
          <section className="rounded-sf-card border border-sf-line bg-sf-card p-6">
            <HandleNotesSection handle={handle} />
          </section>
          <ReportsCard handleId={handleId} onGuardedPush={guardedPush} />
        </div>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setPendingHref(null);
        }}
        open={pendingHref !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard profile changes?</DialogTitle>
            <DialogDescription>
              Your unsaved changes to {handle.opaqueLabel}'s profile will be lost. You can edit it
              again anytime from this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingHref(null)} type="button">
              Keep editing
            </Button>
            <Button onClick={discardAndNavigate} type="button">
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
