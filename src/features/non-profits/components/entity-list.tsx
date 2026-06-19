"use client";

/**
 * Entity result rendering for the find-funders chat view.
 *
 * Results are grouped by type into labeled sections (Foundations / Nonprofits /
 * Grants) so funders and grant recipients are unambiguous; each section expands
 * independently. Extracted from chat-view-client.tsx to keep that file focused
 * on the conversation shell.
 */

import {
  Bookmark,
  BookmarkCheck,
  Building2,
  ChevronDown,
  HandCoins,
  Landmark,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import formatCurrency from "@/utilities/formatCurrency";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import {
  useAddToResearchTray,
  useRemoveFromResearchTray,
  useResearchTray,
} from "../hooks/use-research-tray";
import { type EntityGroup, groupEntitiesByType } from "../lib/group-entities";
import type { FieldRect, PageTransitionFields } from "../store/page-transition";
import { usePageTransitionStore } from "../store/page-transition";
import type { PhilanthropyEntityType, RankedEntity } from "../types/philanthropy";

// ── Entity presentation constants ──────────────────────────────────────────

const ENTITY_ICON: Record<PhilanthropyEntityType, React.ElementType> = {
  foundation: Landmark,
  nonprofit: Building2,
  grant: HandCoins,
};

const ENTITY_LABEL: Record<PhilanthropyEntityType, string> = {
  foundation: "Foundation",
  nonprofit: "Nonprofit",
  grant: "Grant",
};

const ENTITY_BADGE_CLASS: Record<PhilanthropyEntityType, string> = {
  foundation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  nonprofit: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  grant: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const INITIAL_VISIBLE_ENTITIES = 5;

// ── BookmarkButton ──────────────────────────────────────────────────────────
// Isolated component so it can call hooks without prop-drilling tray state.

const BookmarkButton = memo(function BookmarkButton({ entity }: { entity: RankedEntity }) {
  const { authenticated, login } = useAuth();
  const { data: tray = [] } = useResearchTray();
  const { mutate: addToTray, isPending: isAdding } = useAddToResearchTray();
  const { mutate: removeFromTray, isPending: isRemoving } = useRemoveFromResearchTray();

  const trayEntry = tray.find((e) => e.entityId === entity.id);
  const isBookmarked = Boolean(trayEntry);

  const toggle = useCallback(() => {
    if (!authenticated) {
      login();
      return;
    }
    if (isBookmarked && trayEntry) {
      removeFromTray(trayEntry.id);
    } else {
      addToTray(entity);
    }
  }, [authenticated, login, isBookmarked, trayEntry, removeFromTray, addToTray, entity]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggle();
      }}
      aria-label={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
      disabled={isAdding || isRemoving}
      className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-brand dark:hover:bg-zinc-800 dark:hover:text-brand-subtle disabled:opacity-50"
    >
      {isBookmarked ? (
        <BookmarkCheck className="size-3.5 text-brand" />
      ) : (
        <Bookmark className="size-3.5" />
      )}
    </button>
  );
});

// ── Helper functions ────────────────────────────────────────────────────────

function getEntityHref(entity: RankedEntity, searchId?: string): string {
  switch (entity.entityType) {
    case "foundation":
      return NON_PROFITS_PAGES.FOUNDATION(entity.id, searchId);
    case "nonprofit":
      return NON_PROFITS_PAGES.NONPROFIT(entity.id, searchId ? { searchId } : undefined);
    case "grant":
      return NON_PROFITS_PAGES.GRANT(entity.id, searchId);
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

const CompactEntityCard = memo(function CompactEntityCard({
  entity,
  searchId,
}: {
  entity: RankedEntity;
  searchId?: string;
}) {
  const Icon = ENTITY_ICON[entity.entityType];
  const href = getEntityHref(entity, searchId);
  const cardRef = useRef<HTMLDivElement>(null);
  const setTransition = usePageTransitionStore((s) => s.set);

  const meta: string[] = [];
  if (entity.totalAssets) meta.push(`$${formatCurrency(entity.totalAssets)} assets`);
  if (entity.amount) meta.push(`$${formatCurrency(entity.amount)} grant`);
  if (entity.location) meta.push(entity.location);

  const handleLinkClick = useCallback(() => {
    if (!cardRef.current) return;
    const fieldEls = cardRef.current.querySelectorAll<HTMLElement>("[data-field]");
    const collected: Partial<PageTransitionFields> & { name?: FieldRect } = {};
    for (const el of fieldEls) {
      const key = el.dataset.field as keyof PageTransitionFields | undefined;
      if (!key) continue;
      const rect = el.getBoundingClientRect();
      const entry: FieldRect = {
        text: el.textContent?.trim() ?? "",
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
      collected[key] = entry;
    }
    if (collected.name) {
      setTransition(entity.id, entity.entityType, collected as PageTransitionFields);
    }
  }, [entity.id, entity.entityType, setTransition]);

  return (
    <div
      ref={cardRef}
      className="group relative flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <Link href={href} className="contents" onClick={handleLinkClick}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              data-field="name"
              className="truncate text-sm font-medium text-zinc-900 group-hover:text-brand-emphasis dark:text-zinc-100"
            >
              {entity.name ?? "Unnamed"}
            </p>
            <span
              data-field="badge"
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${ENTITY_BADGE_CLASS[entity.entityType]}`}
            >
              {ENTITY_LABEL[entity.entityType]}
            </span>
          </div>
          {entity.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
              {entity.description}
            </p>
          )}
          {meta.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              {meta.map((m, i) => (
                <span key={`${entity.id}-meta-${i}`} className="inline-flex items-center gap-1">
                  {i === meta.length - 1 && entity.location === m && (
                    <>
                      <MapPin className="size-3" />
                      <span data-field="location">{m}</span>
                    </>
                  )}
                  {!(i === meta.length - 1 && entity.location === m) && m}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      <BookmarkButton entity={entity} />
    </div>
  );
});

// A single labeled group (e.g. "Foundations · Potential funders") with its own
// show-more state so each section expands independently.
const EntityGroupSection = memo(function EntityGroupSection({
  group,
  searchId,
}: {
  group: EntityGroup;
  searchId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ENTITY_ICON[group.type];
  const count = group.entities.length;
  const visible = expanded ? group.entities : group.entities.slice(0, INITIAL_VISIBLE_ENTITIES);
  const remaining = count - visible.length;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Icon className="size-3.5 text-zinc-500 dark:text-zinc-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          {count} {pluralize(group.label, count)}
        </h4>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">· {group.role}</span>
      </div>
      {visible.map((e) => (
        <CompactEntityCard key={`${e.entityType}-${e.id}`} entity={e} searchId={searchId} />
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Show all {count} {pluralize(group.label.toLowerCase(), count)}
          <ChevronDown className="size-3" />
        </button>
      )}
    </section>
  );
});

export function EntityList({
  entities,
  searchId,
}: {
  entities: RankedEntity[];
  searchId?: string;
}) {
  const groups = useMemo(() => groupEntitiesByType(entities), [entities]);

  if (groups.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-5">
      {groups.map((group) => (
        <EntityGroupSection key={group.type} group={group} searchId={searchId} />
      ))}
    </div>
  );
}
