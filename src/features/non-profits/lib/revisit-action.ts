/**
 * Decides what ChatView should do with the result of `getById(searchId)` when a
 * conversation URL is opened (revisit / shared link). Extracted as a pure
 * function — like `decideThreadSeed` — because the original inline branching
 * silently re-ran the agent whenever the saved conversation couldn't be used,
 * which spent the user's quota and forked the saved chat (reported bug).
 *
 * The key invariant: an existing, fetchable conversation must be SHOWN, never
 * re-run. Re-running is reserved for the cases where it is the only way to
 * reconstruct the conversation:
 * - a genuine 404 of our own chat that isn't persisted yet, or
 * - an anonymous user who cannot read history (the endpoint needs a wallet, so
 *   `getById` fails) but still holds the original query locally.
 */
import type { AppError } from "./errors";

export type RevisitAction =
  /** Render the saved turns returned by the server. */
  | { kind: "hydrate" }
  /** The entry exists but has no renderable turns — render the empty workbench,
   *  optionally seeding the composer with the saved query (never auto-run it). */
  | { kind: "render-empty"; prefill: string | null }
  /** Re-run the query to rebuild a conversation we cannot fetch. */
  | { kind: "reconstruct"; query: string }
  /** The conversation is private to another account, deleted, or never existed. */
  | { kind: "not-found" };

export function decideRevisitAction(args: {
  result:
    | { ok: true; turnCount: number; remoteQuery: string | null }
    | { ok: false; error: AppError };
  /** Trimmed query from the local session store, if any. */
  localQuery: string | null;
  /** Whether a local session entry exists for this id at all. */
  hasSession: boolean;
}): RevisitAction {
  const { result, localQuery, hasSession } = args;

  if (result.ok) {
    if (result.turnCount > 0) return { kind: "hydrate" };
    // Entry exists (the load succeeded) but carries no turns — they never
    // persisted or were all dropped as malformed. Showing the empty workbench
    // beats re-running and overwriting a real conversation.
    return { kind: "render-empty", prefill: result.remoteQuery };
  }

  const err = result.error;
  // 403 = the conversation exists but belongs to another account. Never
  // reconstruct it under an id we don't own; treat it as not-found/private.
  if (err.type === "ApiError" && err.status === 403) {
    return { kind: "not-found" };
  }

  // Otherwise the conversation isn't fetchable for us — a genuine 404 of our own
  // unpersisted chat, an anonymous user who can't read history, or a transient
  // failure. If we still hold the original query, reconstruct by re-running.
  if (localQuery) return { kind: "reconstruct", query: localQuery };

  // Nothing to reconstruct from: a freshly-created local chat (no query yet)
  // renders the empty workbench; with no local session at all the URL is
  // genuinely private to another account, deleted, or nonexistent.
  if (hasSession) return { kind: "render-empty", prefill: null };
  return { kind: "not-found" };
}
