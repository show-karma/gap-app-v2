"use client";

/**
 * ChatViewClient — ported from grant-atlas
 * features/grant-atlas/components/research-workbench/chat-view.tsx.
 *
 * Full SSE streaming search workbench for /nonprofits/find-funders/search/[id].
 *
 * Key adaptations from grant-atlas:
 * - Router: TanStack Link → next/link
 * - Entity links: PAGES.* → NON_PROFITS_PAGES.* (string hrefs)
 * - Store: useGrantAtlasStore → usePhilanthropyStore
 * - messages selector: useShallow + EMPTY_MESSAGES constant (Zustand v5 safety)
 * - No motion imports; no retry button on stream error (error card only)
 * - New chat: abort stream + reset() store, STAY on current URL
 * - INLINE STARTER_PROMPTS (do NOT use suggested-queries.tsx component)
 */

import {
  Bookmark,
  BookmarkCheck,
  Building2,
  ChevronDown,
  Clock,
  HandCoins,
  Landmark,
  MapPin,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import { Message, MessageContent } from "@/src/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/src/components/ai-elements/prompt-input";
import formatCurrency from "@/utilities/formatCurrency";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { usePhilanthropySearch } from "../hooks/use-philanthropy-stream";
import {
  useAddToResearchTray,
  useRemoveFromResearchTray,
  useResearchTray,
} from "../hooks/use-research-tray";
import { FILINGS_STATS } from "../lib/stats";
import { decideThreadSeed } from "../lib/thread-seed";
import { searchHistoryService } from "../services/search-history.service";
import type { FieldRect, PageTransitionFields } from "../store/page-transition";
import { usePageTransitionStore } from "../store/page-transition";
import { type ChatTurn, EMPTY_MESSAGES, usePhilanthropyStore } from "../store/philanthropy";
import { useSearchSessionStore } from "../store/search-session";
import type { PhilanthropyEntityType, RankedEntity } from "../types/philanthropy";
import { AttachmentsPanel } from "./attachments-panel";
import { BookmarksDrawer } from "./bookmarks-drawer";
import { ConnectorNudge } from "./connector-nudge";
import { NarrativeBlock } from "./narrative-block";
import { ProgressView } from "./progress-view";
import { SearchFeedback } from "./search-feedback";
import { SearchHistoryPanel } from "./search-history-panel";

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

// ── Inline starter prompts (LOCKED decision — do NOT use suggested-queries.tsx) ──

const STARTER_PROMPTS = [
  "Foundations funding youth literacy in Ohio under $10M",
  "Funders of refugee resettlement giving over $250k since 2024",
  "Family foundations that funded peers in climate justice last year",
  "Build a tiered prospect list for a $2M capital campaign",
] as const;

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

function EntityList({ entities, searchId }: { entities: RankedEntity[]; searchId?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (entities.length === 0) return null;

  const visible = expanded ? entities : entities.slice(0, INITIAL_VISIBLE_ENTITIES);
  const remaining = entities.length - visible.length;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {visible.map((e) => (
        <CompactEntityCard key={`${e.entityType}-${e.id}`} entity={e} searchId={searchId} />
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Show all {entities.length} results
          <ChevronDown className="size-3" />
        </button>
      )}
    </div>
  );
}

const AssistantTurn = memo(function AssistantTurn({
  turn,
  searchId,
}: {
  turn: ChatTurn;
  searchId?: string;
}) {
  const isStreaming = turn.status === "streaming";
  const hasNarrative = turn.narrative.length > 0;

  return (
    <Message from="assistant">
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-emphasis text-white">
          <Sparkles className="size-3" />
        </div>
        <span className="font-medium">Prospecting Agent</span>
        {isStreaming && !hasNarrative && (
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <Spinner className="size-3" />
            {FILINGS_STATS.searchingProgressLabel}
          </span>
        )}
      </div>
      <MessageContent>
        {/* Error card — no retry button (LOCKED decision) */}
        {turn.status === "error" && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
            {turn.error ?? "Something went wrong."}
          </div>
        )}
        {isStreaming && turn.progress && <ProgressView progress={turn.progress} />}
        {hasNarrative && (
          <NarrativeBlock narrative={turn.narrative} entities={[...turn.entities]} />
        )}
        {turn.entities.length > 0 && (
          <EntityList entities={[...turn.entities]} searchId={searchId} />
        )}
        {turn.attachments.length > 0 && <AttachmentsPanel attachments={[...turn.attachments]} />}
        {turn.status === "done" && turn.traceId && (
          <SearchFeedback key={turn.traceId} traceId={turn.traceId} />
        )}
      </MessageContent>
    </Message>
  );
});

const UserTurn = memo(function UserTurn({ text }: { text: string }) {
  return (
    <Message from="user">
      <MessageContent>{text}</MessageContent>
    </Message>
  );
});

// ── Main ChatView ───────────────────────────────────────────────────────────

export function ChatView({ searchId }: { searchId?: string }) {
  // Zustand v5 selector-safety: use useShallow + EMPTY_MESSAGES constant.
  // NEVER: (s) => s.messages bare, NEVER inline ?? [].
  const messages = usePhilanthropyStore(
    useShallow((s) => (s.messages.length === 0 ? EMPTY_MESSAGES : s.messages))
  );
  const isSearching = usePhilanthropyStore((s) => s.isSearching);
  const reset = usePhilanthropyStore((s) => s.reset);
  const { search, abort } = usePhilanthropySearch();
  const { authenticated, login } = useAuth();

  const [input, setInput] = useState("");
  const [trayOpen, setTrayOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // searchId this component instance last seeded. A plain boolean is not
  // enough: navigating between two session URLs reuses the same instance
  // (same dynamic segment), so the ref must be keyed by session.
  const seededSearchIdRef = useRef<string | null>(null);

  // Seed the thread for the session in the URL. The philanthropy store is
  // global and survives client-side navigation, so arriving here can mean:
  // - empty store (cold load) → seed from the session store, falling back
  //   to searchHistoryService.getById() (shared link);
  // - the store still holds THIS session's thread (remount/back-nav) →
  //   keep it;
  // - the store holds a PREVIOUS session's thread (landing → new search) →
  //   reset it, then seed. Without this branch the new query was silently
  //   swallowed and the stale conversation rendered until a hard refresh.
  useEffect(() => {
    if (!searchId) return;
    const store = usePhilanthropyStore.getState();
    const decision = decideThreadSeed({
      searchId,
      seededSearchId: seededSearchIdRef.current,
      messageCount: store.messages.length,
      threadId: store.threadId,
    });
    if (decision === "already-seeded") return;
    seededSearchIdRef.current = searchId;
    if (decision === "adopt-existing-thread") return;
    if (decision === "reset-then-seed") {
      abort();
      reset();
    }
    usePhilanthropyStore.getState().setThreadId(searchId);
    // Fast path: local session store
    const session = useSearchSessionStore.getState().getSession(searchId);
    const localQuery = session?.query?.trim();
    if (localQuery) {
      void search(localQuery, 1, { chat: true });
      return;
    }
    // Fallback: fetch from server (shared link / cold load)
    void searchHistoryService.getById(searchId).match(
      (entry) => {
        const remoteQuery = entry.query?.trim();
        if (!remoteQuery) return;
        useSearchSessionStore.getState().setSession(searchId, remoteQuery);
        void search(remoteQuery, 1, { chat: true });
      },
      () => {
        /* 404 or error — render empty workbench, degrade gracefully */
      }
    );
  }, [searchId, messages.length, search, abort, reset]);

  const onSubmit = useCallback(
    (msg: PromptInputMessage) => {
      const text = msg.text.trim();
      if (!text || isSearching) return;
      setInput("");
      void search(text, 1, { chat: true });
    },
    [search, isSearching]
  );

  const onStarterClick = useCallback(
    (q: string) => {
      if (isSearching) return;
      void search(q, 1, { chat: true });
    },
    [search, isSearching]
  );

  // New chat: abort active stream + reset chat store, STAY on current URL.
  // Clear the session's seed query so the initial-query effect (re-armed by
  // resetting the ref below) doesn't immediately re-run the original query.
  const onNewChat = useCallback(() => {
    abort();
    reset();
    if (searchId) useSearchSessionStore.getState().clearSession(searchId);
    seededSearchIdRef.current = null;
  }, [abort, reset, searchId]);

  const showEmpty = messages.length === 0 && !isSearching;
  const lastTurn = messages[messages.length - 1];
  const showNudge = useMemo(
    () => messages.some((m) => m.status === "done" && m.entities.length > 0),
    [messages]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar with new-chat affordance + tray/history controls */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-emphasis text-white">
              <Sparkles className="size-3" />
            </div>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Prospecting Agent</span>
            {lastTurn && (
              <span className="text-zinc-400 dark:text-zinc-500">
                · {messages.length} {pluralize("turn", messages.length)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                type="button"
                aria-label="Search history"
                onClick={() => {
                  if (!authenticated) {
                    login();
                    return;
                  }
                  setHistoryOpen((v) => !v);
                }}
                className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <Clock className="size-3.5" />
              </button>
              <SearchHistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
            </div>
            <button
              type="button"
              aria-label="Bookmarks"
              onClick={() => {
                if (!authenticated) {
                  login();
                  return;
                }
                setTrayOpen(true);
              }}
              className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <Bookmark className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onNewChat}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              New chat
            </button>
          </div>
        </div>
      )}
      <BookmarksDrawer open={trayOpen} onClose={() => setTrayOpen(false)} />

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {showEmpty ? (
            <ConversationEmptyState
              icon={<Sparkles className="size-8 text-brand" />}
              title="Ask the prospecting agent"
              description="Find funders, draft outreach, narrow by region or check size — in plain English."
            >
              <div className="mt-4 grid w-full gap-2 sm:grid-cols-2">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => onStarterClick(p)}
                    className="rounded-lg border border-zinc-200 bg-white p-3 text-left text-sm text-zinc-700 transition-colors hover:border-brand-subtle hover:bg-brand-faint dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand-emphasis dark:hover:bg-brand/20"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {messages.map((turn) =>
                turn.status === "error" && !turn.userQuery ? null : (
                  <div key={turn.id} className="flex flex-col gap-4">
                    <UserTurn text={turn.userQuery} />
                    <AssistantTurn turn={turn} searchId={searchId} />
                  </div>
                )
              )}
              {showNudge && (
                <div className="mx-auto w-full max-w-2xl">
                  <ConnectorNudge />
                </div>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Composer */}
      <div className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={onSubmit}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={
                  messages.length === 0
                    ? "Ask the prospecting agent…"
                    : "Ask a follow-up — e.g. narrow to Texas, draft outreach for top 3"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <span className="px-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Plain English · {FILINGS_STATS.composerFooterLabel}
                </span>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!input.trim() || isSearching}
                status={isSearching ? "streaming" : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
