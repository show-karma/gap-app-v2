import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useEffect, useRef, useState } from "react";
import type { FastReportEvent } from "@/types/donor-research";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

interface StreamState {
  events: FastReportEvent[];
  latest: FastReportEvent | null;
  /** AbortController signal flag — `true` while connected, `false` after close. */
  connected: boolean;
  errorCount: number;
}

const INITIAL_STREAM_STATE: StreamState = {
  events: [],
  latest: null,
  connected: false,
  errorCount: 0,
};

const TERMINAL_EVENT_NAMES = new Set(["report_finalized", "report_failed"]);

const KNOWN_EVENT_NAMES = new Set<FastReportEvent["name"]>([
  "snapshot",
  "pool_loaded",
  "compliance_complete",
  "contact_discovery_progress",
  "contact_discovery_complete",
  "activity_complete",
  "ranking_complete",
  "report_finalized",
  "report_failed",
]);

/**
 * Maximum number of consecutive transient errors tolerated before the
 * stream gives up reconnecting. The backend replays missed stages on
 * reconnect, so a handful of retries covers any realistic transient
 * blip; beyond this we treat the stream as terminally disconnected and
 * leave the caller to fall back to polling.
 */
export const MAX_STREAM_RETRIES = 5;

/**
 * Pure event-merge: dedupes by `name` while preserving first-seen order.
 *
 * The backend emitter replays every prior stage on reconnect, so naive
 * appending would grow the array unbounded and feed duplicate stages to
 * `ProgressTimeline`. Instead, when an event with the same name already
 * exists we replace it in place (keeping its position) so the array is
 * bounded by the number of distinct stage names; otherwise we append.
 */
export function mergeStreamEvents(
  existing: FastReportEvent[],
  next: FastReportEvent
): FastReportEvent[] {
  const index = existing.findIndex((event) => event.name === next.name);
  if (index === -1) {
    return [...existing, next];
  }
  const merged = existing.slice();
  merged[index] = next;
  return merged;
}

/**
 * Subscribes to the SSE progress stream for a Fast/Deep report.
 *
 * Uses `@microsoft/fetch-event-source` instead of the native
 * `EventSource` so we can send the Privy JWT in the standard
 * `Authorization: Bearer …` header. The native EventSource API has
 * no way to set custom headers, which forced us to either embed
 * the JWT in the URL (security risk — leaks via access logs, history,
 * Referer) or run an unauthenticated stream. Neither is acceptable.
 *
 * Returns the deduped, first-seen-ordered event list (for replay UIs)
 * plus the latest event (for status banners). Reconnects automatically
 * on transient errors up to `MAX_STREAM_RETRIES` consecutive failures;
 * the backend emitter replays prior stages on reconnect, so we dedupe
 * by stage name (see `mergeStreamEvents`) to keep the timeline bounded
 * and free of duplicates.
 */
export function useDonorReportStream(reportId: string | null) {
  const [state, setState] = useState<StreamState>(INITIAL_STREAM_STATE);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear any prior report's accumulated events when the subscribed
    // report changes, so switching reports never briefly renders the
    // previous report's timeline before the new snapshot arrives.
    setState(INITIAL_STREAM_STATE);
    if (!reportId) return;

    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;
    let closed = false;
    // Consecutive transient-error count, tracked locally because the
    // batched `setState` value isn't readable synchronously inside the
    // `onerror` callback. Reset to 0 on every healthy open/message.
    let errorCount = 0;

    const handleNamedEvent = (eventName: FastReportEvent["name"], data: string): boolean => {
      try {
        const parsed = JSON.parse(data) as FastReportEvent;
        // Server may emit a name we don't model yet; ignore rather than crash.
        const safe: FastReportEvent = KNOWN_EVENT_NAMES.has(parsed.name)
          ? parsed
          : { ...parsed, name: eventName };
        errorCount = 0;
        setState((s) => ({
          ...s,
          events: mergeStreamEvents(s.events, safe),
          latest: safe,
          connected: true,
          // A delivered message proves the stream is healthy again —
          // reset the consecutive-error counter so a later blip starts
          // its retry budget from scratch.
          errorCount: 0,
        }));
        if (TERMINAL_EVENT_NAMES.has(safe.name)) {
          closed = true;
          controller.abort();
          return true;
        }
      } catch {
        // Malformed payload — drop the event but keep the stream open.
      }
      return false;
    };

    (async () => {
      const token = await TokenManager.getToken().catch(() => null);
      if (cancelled) return;

      const baseUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
      const url = `${baseUrl}${INDEXER.DONOR_RESEARCH.REPORT_STREAM(reportId)}`;
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      try {
        await fetchEventSource(url, {
          method: "GET",
          headers,
          // Auth flows via the Authorization header, not cookies, so
          // we don't need credentials-mode CORS. Avoids the
          // `Allow-Origin: '*'` + `Allow-Credentials: true` mismatch
          // that the indexer's global fastify-cors config rejects.
          credentials: "omit",
          signal: controller.signal,
          // Keep the connection open when the tab is hidden so progress
          // keeps streaming in the background; the report often finishes
          // while the user is on another tab.
          openWhenHidden: true,
          onopen: async (response) => {
            if (response.ok) {
              // Healthy (re)connection — clear the consecutive-error
              // counter so the retry budget resets.
              errorCount = 0;
              setState((s) => ({ ...s, connected: true, errorCount: 0 }));
              return;
            }
            // Non-ok response means the server refused (401/404/etc).
            // Surface as an error and stop retrying — the user has to
            // re-authenticate or fix the URL; no point burning cycles.
            setState((s) => ({ ...s, errorCount: s.errorCount + 1 }));
            throw new Error(`Stream open failed: ${response.status}`);
          },
          onmessage: (ev) => {
            const name = (ev.event || "message") as FastReportEvent["name"];
            handleNamedEvent(name, ev.data);
          },
          onerror: (err) => {
            // Returning `undefined` lets the library retry; throwing
            // aborts it permanently. We retry transparently (the emitter
            // replays prior stages) until we hit MAX_STREAM_RETRIES
            // consecutive failures, then give up so we don't reconnect
            // forever.
            if (closed) throw err;
            errorCount += 1;
            setState((s) => ({
              ...s,
              connected: false,
              errorCount,
            }));
            if (errorCount >= MAX_STREAM_RETRIES) {
              // Retry budget exhausted — abort and stay disconnected.
              closed = true;
              throw err;
            }
          },
          onclose: () => {
            setState((s) => ({ ...s, connected: false }));
          },
        });
      } catch {
        // fetchEventSource rejected because a callback threw — either a
        // non-ok open (401/404/etc) or MAX_STREAM_RETRIES consecutive
        // transient failures. The stream is terminally disconnected;
        // make sure the state reflects that. The caller decides whether
        // to refetch via polling.
        if (!cancelled) {
          setState((s) => ({ ...s, connected: false }));
        }
      }
    })();

    return () => {
      cancelled = true;
      closed = true;
      controller.abort();
      abortRef.current = null;
    };
  }, [reportId]);

  return state;
}
