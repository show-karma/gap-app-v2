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
 * - New chat: abort stream + reset() store, replace URL with a fresh session
 *   id (conversations are persisted per URL id)
 * - INLINE STARTER_PROMPTS (do NOT use suggested-queries.tsx component)
 */

import { Bookmark, Clock, SearchX, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { TokenManager } from "@/utilities/auth/token-manager";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { usePhilanthropySearch } from "../hooks/use-philanthropy-stream";
import { decideRevisitAction, type RevisitAction } from "../lib/revisit-action";
import { savedTurnsToChatTurns } from "../lib/saved-conversation";
import { FILINGS_STATS } from "../lib/stats";
import { decideThreadSeed } from "../lib/thread-seed";
import { type SearchHistoryDetail, searchHistoryService } from "../services/search-history.service";
import { type ChatTurn, EMPTY_MESSAGES, usePhilanthropyStore } from "../store/philanthropy";
import { useSearchSessionStore } from "../store/search-session";
import { AttachmentsPanel } from "./attachments-panel";
import { BookmarksDrawer } from "./bookmarks-drawer";
import { ComposerLockNotice } from "./composer-lock-notice";
import { ConnectorNudge } from "./connector-nudge";
import { EntityList } from "./entity-list";
import { NarrativeBlock } from "./narrative-block";
import { ProgressView } from "./progress-view";
import { SearchFeedback } from "./search-feedback";
import { SearchHistoryPanel } from "./search-history-panel";

// Sign-in recovery polls for the auth JWT. The Privy↔wagmi sync can lag the
// token by ~10-15s, so poll across a window that comfortably covers it rather
// than giving up early and leaving the chat stuck until a manual refresh.
const AUTH_RECOVERY_POLL_INTERVAL_MS = 400;
const AUTH_RECOVERY_POLL_TIMEOUT_MS = 16_000;

// ── Inline starter prompts (LOCKED decision — do NOT use suggested-queries.tsx) ──

const STARTER_PROMPTS = [
  "Foundations funding youth literacy in Ohio under $10M",
  "Funders of refugee resettlement giving over $250k since 2024",
  "Family foundations that funded peers in climate justice last year",
  "Build a tiered prospect list for a $2M capital campaign",
] as const;

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
  const readOnly = usePhilanthropyStore((s) => s.readOnly);
  const notFound = usePhilanthropyStore((s) => s.notFound);
  const conversationFull = usePhilanthropyStore((s) => s.conversationFull);
  const loginRequired = usePhilanthropyStore((s) => s.loginRequired);
  const reset = usePhilanthropyStore((s) => s.reset);
  const { search, abort } = usePhilanthropySearch();
  const { authenticated, login } = useAuth();
  const router = useRouter();

  const [input, setInput] = useState("");
  const [trayOpen, setTrayOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // searchId this component instance last seeded. A plain boolean is not
  // enough: navigating between two session URLs reuses the same instance
  // (same dynamic segment), so the ref must be keyed by session.
  const seededSearchIdRef = useRef<string | null>(null);
  // Bumped to force the seeding effect (which lists `reseedKey` in its deps) to
  // re-run after sign-in. Must be state, not a ref — a ref mutation wouldn't
  // re-trigger the effect.
  const [reseedKey, setReseedKey] = useState(0);

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
    // Clear any not-found state from a previously-viewed conversation.
    usePhilanthropyStore.getState().setNotFound(false);
    const sessionStore = useSearchSessionStore.getState();
    const session = sessionStore.getSession(searchId);
    const localQuery = session?.query?.trim();
    // Fast path: a session minted just now (landing page submit / new chat)
    // runs its query immediately. `consumeFresh` is one-shot, so any later
    // visit to the same URL takes the hydration path below instead of
    // re-running the search.
    if (sessionStore.consumeFresh(searchId)) {
      if (localQuery) void search(localQuery, 1, { chat: true });
      return;
    }
    // Revisit / shared link: fetch the saved conversation and act on the result
    // via the pure `decideRevisitAction` decision. An existing, fetchable
    // conversation is always SHOWN — re-running is reserved for chats we cannot
    // fetch (our own unpersisted chat, or an anonymous user who can't read
    // history). See `lib/revisit-action.ts`.
    const apply = (action: RevisitAction, entry?: SearchHistoryDetail) => {
      // Stale-resolution guard: `getById` is async and uncancellable. If the
      // session changed while it was in flight (e.g. "New chat" or switching
      // history items), this instance has already re-seeded a different id —
      // dropping the late result keeps it from hydrating the old conversation
      // back into the current session.
      if (seededSearchIdRef.current !== searchId) return;
      switch (action.kind) {
        case "hydrate":
          if (!entry) return;
          useSearchSessionStore.getState().setSession(searchId, entry.query);
          usePhilanthropyStore.getState().hydrateTurns(savedTurnsToChatTurns(entry.turns));
          return;
        case "render-empty": {
          const { prefill } = action;
          if (prefill) {
            useSearchSessionStore.getState().setSession(searchId, prefill);
            setInput((current) => current || prefill);
          }
          return;
        }
        case "reconstruct":
          void search(action.query, 1, { chat: true });
          return;
        case "not-found":
          usePhilanthropyStore.getState().setNotFound(true);
          return;
      }
    };
    void searchHistoryService.getById(searchId).match(
      (entry) =>
        apply(
          decideRevisitAction({
            result: {
              ok: true,
              turnCount: entry.turns.length,
              remoteQuery: entry.query?.trim() || null,
            },
            localQuery: localQuery ?? null,
            hasSession: Boolean(session),
          }),
          entry
        ),
      (error) =>
        apply(
          decideRevisitAction({
            result: { ok: false, error },
            localQuery: localQuery ?? null,
            hasSession: Boolean(session),
          })
        )
    );
    // Keyed on `searchId` only. `messages.length` must NOT be a dependency:
    // "New chat" calls reset() (clearing messages) and then router.replace() to
    // the new session, but the replace is async, so a messages.length trigger
    // re-runs this effect while `searchId` is still the OLD id — re-seeding it
    // and re-fetching the old conversation, which flashes empty then snaps back
    // to the previous search. The count is still read fresh via getState above.
    // `reseedKey` is the one allowed re-trigger: it fires only on sign-in (below).
  }, [searchId, search, abort, reset, reseedKey]);

  // Recover a blocked conversation after sign-in. Opening one while logged out
  // leaves it in one of two auth-recoverable states that used to stick until a
  // manual refresh:
  //   - `notFound`: a chat private to your account 403s on getById.
  //   - `loginRequired`: a chat the seeding effect tried to reconstruct hit the
  //     agent's anonymous limit (401) → "Sign in to continue your search."
  // Both become resolvable once authenticated, but a naive `authenticated`
  // refetch is unreliable: Privy flips `authenticated` true BEFORE the JWT is
  // minted and flickers for ~10-15s during the wagmi sync, and email/social
  // logins never expose a wallet address. So we gate on the actual token —
  // polling TokenManager.getToken() (exactly what apiFetch uses) until a real
  // JWT exists — then recover exactly once. `authRecoveredRef` keys the one-shot
  // to the searchId so a genuinely private (someone else's) chat can't loop.
  const authRecoveredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authenticated || !searchId) return;
    if (!notFound && !loginRequired) return;
    if (authRecoveredRef.current === searchId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pollDeadline = Date.now() + AUTH_RECOVERY_POLL_TIMEOUT_MS;
    const recover = () => {
      if (authRecoveredRef.current === searchId) return;
      authRecoveredRef.current = searchId;
      const store = usePhilanthropyStore.getState();
      // A readable conversation is already loaded — the block was only the
      // composer lock from an anonymous "continue" attempt. Unlock and keep it.
      if (store.messages.some((turn) => turn.status === "done")) {
        store.setLoginRequired(false);
        return;
      }
      // Nothing usable is loaded (private 403, or an anonymous-limit error
      // turn): re-seed from a clean slate now that auth is in place. reset()
      // also clears notFound/loginRequired.
      store.reset();
      seededSearchIdRef.current = null;
      setReseedKey((k) => k + 1);
    };
    // Recursive scheduling (not a loop) so each retry is its own tick.
    const tryRecover = () => {
      void TokenManager.getToken().then((token) => {
        if (cancelled) return;
        if (token) {
          recover();
        } else if (Date.now() < pollDeadline) {
          timer = setTimeout(tryRecover, AUTH_RECOVERY_POLL_INTERVAL_MS);
        }
      });
    };
    tryRecover();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authenticated, searchId, notFound, loginRequired]);

  const onSubmit = useCallback(
    (msg: PromptInputMessage) => {
      const text = msg.text.trim();
      if (!text || isSearching || readOnly || conversationFull || loginRequired) return;
      setInput("");
      void search(text, 1, { chat: true });
    },
    [search, isSearching, readOnly, conversationFull, loginRequired]
  );

  const onStarterClick = useCallback(
    (q: string) => {
      if (isSearching) return;
      void search(q, 1, { chat: true });
    },
    [search, isSearching]
  );

  // New chat: abort active stream + reset chat store, then move to a fresh
  // session URL. Conversations are persisted under the URL id, so staying on
  // the old URL would either resurrect the saved thread (the seeding effect
  // hydrates it) or append unrelated turns to it — a new id gives the next
  // conversation its own saved thread. `createSession("")` marks the new id
  // fresh so the seeding effect renders an empty workbench without fetching.
  const onNewChat = useCallback(() => {
    abort();
    reset();
    seededSearchIdRef.current = null;
    const newId = useSearchSessionStore.getState().createSession("");
    router.replace(NON_PROFITS_PAGES.SEARCH(newId));
  }, [abort, reset, router]);

  const showEmpty = messages.length === 0 && !isSearching;
  const lastTurn = messages[messages.length - 1];
  const showNudge = useMemo(
    () => messages.some((m) => m.status === "done" && m.entities.length > 0),
    [messages]
  );

  // Not-found state: the conversation URL is private to another account,
  // deleted, or never existed (server 404 with no local query to re-run).
  if (notFound) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
        <SearchX className="size-10 text-zinc-400 dark:text-zinc-500" />
        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Conversation not found
        </h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          This conversation is private to another account, was deleted, or never existed.
        </p>
        <button
          type="button"
          onClick={onNewChat}
          className="mt-5 rounded-lg !bg-brand px-4 py-2 text-sm font-medium !text-white transition-colors hover:!bg-brand-emphasis"
        >
          Start a new chat
        </button>
      </div>
    );
  }

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

      {/* Composer — replaced by a notice when the conversation can't accept
          more input: owned by another account (403), full (409), or the
          anonymous free limit was reached (401 → sign-in prompt). */}
      <div className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-3xl">
          {readOnly || conversationFull || loginRequired ? (
            <ComposerLockNotice
              reason={loginRequired ? "login" : conversationFull ? "full" : "readonly"}
              onNewChat={onNewChat}
              onSignIn={login}
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
