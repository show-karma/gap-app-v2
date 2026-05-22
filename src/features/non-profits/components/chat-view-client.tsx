"use client";

/**
 * ChatViewClient — ported from grant-atlas
 * features/grant-atlas/components/research-workbench/chat-view.tsx.
 *
 * Full SSE streaming search workbench for /non-profits/search/[id].
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
  Building2,
  Check,
  ChevronDown,
  HandCoins,
  Landmark,
  MapPin,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Spinner } from "@/components/ui/spinner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import { Message, MessageContent } from "@/src/components/ai-elements/message";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
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
import { type ChatTurn, EMPTY_MESSAGES, usePhilanthropyStore } from "../store/philanthropy";
import { useSearchSessionStore } from "../store/search-session";
import type { PhilanthropyEntityType, RankedEntity } from "../types/philanthropy";
import { AttachmentsPanel } from "./attachments-panel";
import { ConnectorNudge } from "./connector-nudge";

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

function formatToolName(tool: string): string {
  return tool.replace(/^mcp__[^_]+__/, "").replace(/_/g, " ");
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

  const meta: string[] = [];
  if (entity.totalAssets) meta.push(`$${formatCurrency(entity.totalAssets)} assets`);
  if (entity.amount) meta.push(`$${formatCurrency(entity.amount)} grant`);
  if (entity.location) meta.push(entity.location);

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-zinc-900 group-hover:text-brand-emphasis dark:text-zinc-100">
            {entity.name ?? "Unnamed"}
          </p>
          <span
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
                {i === meta.length - 1 && entity.location === m && <MapPin className="size-3" />}
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
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

function ProgressView({ progress }: { progress: NonNullable<ChatTurn["progress"]> }) {
  const { toolHistory, latestThought, matchedNames } = progress;
  const hasAnything = toolHistory.length > 0 || latestThought !== null || matchedNames.length > 0;

  if (!hasAnything) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
        <Spinner className="size-3" />
        searching 140,221 filings…
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      {toolHistory.length > 0 && (
        <ul className="flex flex-col gap-1">
          {toolHistory.map((entry, i) => (
            <li
              key={`${entry.tool}-${i}`}
              className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {entry.status === "running" && <Spinner className="size-3" />}
                {entry.status === "completed" && (
                  <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                )}
                {entry.status === "failed" && (
                  <X className="size-3 text-red-600 dark:text-red-400" />
                )}
              </span>
              <Wrench className="size-3 shrink-0 text-zinc-400" />
              <span className="font-mono">{formatToolName(entry.tool)}</span>
            </li>
          ))}
        </ul>
      )}
      {latestThought && (
        <p className="text-xs italic text-zinc-500 dark:text-zinc-400">{latestThought}</p>
      )}
      {matchedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {matchedNames.slice(0, 12).map((name) => (
            <span
              key={name}
              className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-white dark:bg-brand/20 dark:text-brand-subtle"
            >
              {name}
            </span>
          ))}
          {matchedNames.length > 12 && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              +{matchedNames.length - 12} more
            </span>
          )}
        </div>
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
            searching 140,221 filings…
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
        {hasNarrative && <MessageResponse>{turn.narrative}</MessageResponse>}
        {turn.entities.length > 0 && (
          <EntityList entities={[...turn.entities]} searchId={searchId} />
        )}
        {turn.attachments.length > 0 && <AttachmentsPanel attachments={[...turn.attachments]} />}
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

  const [input, setInput] = useState("");
  const initialQueryRanRef = useRef(false);

  // First-time load: when arriving on /non-profits/search/[id] with an empty
  // thread, grab the initial query from the search session store and run it.
  useEffect(() => {
    if (initialQueryRanRef.current) return;
    if (!searchId) return;
    if (messages.length > 0) {
      initialQueryRanRef.current = true;
      return;
    }
    // Access sessions via getState() — never as a reactive selector (object).
    const session = useSearchSessionStore.getState().getSession(searchId);
    const initialQuery = session?.query?.trim();
    if (!initialQuery) return;
    initialQueryRanRef.current = true;
    void search(initialQuery, 1, { chat: true });
  }, [searchId, messages.length, search]);

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
  const onNewChat = useCallback(() => {
    abort();
    reset();
    initialQueryRanRef.current = false;
  }, [abort, reset]);

  const showEmpty = messages.length === 0 && !isSearching;
  const lastTurn = messages[messages.length - 1];
  const showNudge = useMemo(
    () => messages.some((m) => m.status === "done" && m.entities.length > 0),
    [messages]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar with new-chat affordance */}
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
          <button
            type="button"
            onClick={onNewChat}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            New chat
          </button>
        </div>
      )}

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
                  Plain English · 140,221 filings indexed
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
