"use client";

import { memo, useEffect, useRef, useState } from "react";
import { EmptyState, ErrorState, SkeletonList } from "@/components/Pages/Dashboard/v3/primitives";
import { SoftIcon } from "@/components/Pages/Dashboard/v3/SoftIcon";
import {
  BTN_BASE,
  BTN_MD,
  BTN_PRIMARY,
  badgeClasses,
  THUMB_BASE,
} from "@/components/Pages/Dashboard/v3/soft-classes";
import { useDonorHandles } from "@/hooks/useDonorHandles";
import { useDonorPersona } from "@/hooks/useDonorPersona";
import { Link } from "@/src/components/navigation/Link";
import type { DonorHandle } from "@/types/donor-research";
import { renderRelativeTime } from "@/utilities/formatRelativeTime";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { NewDonorHandleModal } from "../criteria-input/NewDonorHandleModal";

/** Header "New persona" trigger — opens the quick-create dialog. */
function NewPersonaButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      className={cn(BTN_BASE, BTN_MD, BTN_PRIMARY, className)}
      onClick={onClick}
      type="button"
    >
      <SoftIcon className="h-4 w-4" name="plus" />
      New persona
    </button>
  );
}

/** One persona row — its own `useDonorPersona` call drives the "Profile
 * ready" / "No profile yet" chip. Memoized: this list can grow to 100+ rows
 * and each row owns an independent query subscription.
 *
 * The persona fetch is gated on the row actually scrolling into view: a full
 * list (`useDonorHandles({ limit: 200 })`) mounting 200 rows at once would
 * otherwise fire 200 concurrent `useDonorPersona` GETs in one burst — the
 * same class of refetch storm as the dashboard advisor module (GAP A11).
 * `useDonorPersona(null)` disables the query via its own `enabled: !!handleId`
 * check, so no hook contract changes are needed here — once visible, a row
 * stays "fetched" (no unobserve-on-scroll-away thrash). */
const PersonaRow = memo(function PersonaRow({ handle }: { handle: DonorHandle }) {
  const rowRef = useRef<HTMLLIElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return;
    const node = rowRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      // No observer support (or nothing to observe yet) — fail open rather
      // than permanently hiding the chip.
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  const personaQuery = useDonorPersona(isVisible ? handle.id : null);
  // Graceful degrade: a persona-fetch failure hides the chip rather than
  // blocking the row (mirrors RateLimitCounter's "—" posture) — the persona
  // page itself surfaces the real error when the advisor opens it.
  const personaExists = personaQuery.isSuccess ? personaQuery.data !== null : null;

  return (
    <li className="[&+&]:border-t [&+&]:border-sf-line" ref={rowRef}>
      <div className="flex items-center gap-3 px-4 py-[15px]">
        <Link
          className="flex min-w-0 flex-1 items-center gap-[14px] transition-colors"
          href={PAGES.DONOR_RESEARCH.PERSONA(handle.id)}
        >
          <div className={cn(THUMB_BASE, "h-9 w-9 rounded-[9px]")}>
            <SoftIcon className="h-4 w-4" name="users" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-[13.5px] font-[600] text-sf-heading">
                {handle.opaqueLabel}
              </span>
              {personaExists === null ? null : (
                <span className={badgeClasses(personaExists ? "brand" : "gray")}>
                  {personaExists ? "Profile ready" : "No profile yet"}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[12.5px] text-sf-muted">
              {handle.notes || "No notes yet"}
            </p>
            <p className="mt-0.5 text-[11.5px] text-sf-muted">
              Updated {renderRelativeTime(handle.updatedAt)}
            </p>
          </div>
        </Link>
        <Link
          className={cn(
            BTN_BASE,
            "h-8 flex-none whitespace-nowrap border-sf-line-strong bg-sf-card px-3 text-[12.5px] text-sf-heading hover:bg-sf-elev"
          )}
          href={`${PAGES.DONOR_RESEARCH.NEW}?handle=${handle.id}`}
        >
          New report
        </Link>
      </div>
    </li>
  );
});
PersonaRow.displayName = "PersonaRow";

interface PersonaListBodyProps {
  handlesQuery: ReturnType<typeof useDonorHandles>;
  onRequestCreate: () => void;
}

function PersonaListBody({ handlesQuery, onRequestCreate }: PersonaListBodyProps) {
  if (handlesQuery.isLoading) {
    return <SkeletonList count={4} />;
  }

  if (handlesQuery.isError) {
    return (
      <ErrorState
        message={
          (handlesQuery.error as Error)?.message || "Couldn't load your personas. Try again."
        }
        onRetry={() => handlesQuery.refetch()}
      />
    );
  }

  const handles = handlesQuery.data?.items ?? [];
  if (handles.length === 0) {
    return (
      <EmptyState
        action={<NewPersonaButton onClick={onRequestCreate} />}
        body="Create a persona to research on a donor's behalf. Each persona can hold a profile, private notes, and its own reports."
        icon="users"
        title="No personas yet"
      />
    );
  }

  return (
    <ul className="flex flex-col overflow-hidden rounded-sf-tile border border-sf-line bg-sf-card">
      {handles.map((handle) => (
        <PersonaRow handle={handle} key={handle.id} />
      ))}
    </ul>
  );
}

/**
 * Personas (donor handles) list — redesign P2, spec 2.3 "Personas list". Donor
 * handles are presented to advisors as "Personas"; the code/API identifiers
 * are unchanged.
 */
export function PersonasListView() {
  const handlesQuery = useDonorHandles({ limit: 200 });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-sf-heading">Personas</h1>
          <p className="mt-1 text-[13.5px] text-sf-muted">
            Anonymous profiles for the donors you advise. Each one can hold private notes and its
            own research reports.
          </p>
        </div>
        <NewPersonaButton onClick={() => setCreateOpen(true)} />
      </header>

      <PersonaListBody handlesQuery={handlesQuery} onRequestCreate={() => setCreateOpen(true)} />

      <NewDonorHandleModal onOpenChange={setCreateOpen} open={createOpen} />
    </div>
  );
}
