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

const TERMINAL_EVENT_NAMES = new Set(["report_finalized", "report_failed"]);

const KNOWN_EVENT_NAMES = new Set<FastReportEvent["name"]>([
  "snapshot",
  "pool_loaded",
  "compliance_complete",
  "contact_discovery_complete",
  "activity_complete",
  "ranking_complete",
  "report_finalized",
  "report_failed",
]);

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
 * Returns the full ordered event list (for replay UIs) plus the
 * latest event (for status banners). Reconnects automatically on
 * transient errors; the backend emitter replays missed stages on
 * reconnect so the timeline stays accurate.
 */
export function useDonorReportStream(reportId: string | null) {
  const [state, setState] = useState<StreamState>({
    events: [],
    latest: null,
    connected: false,
    errorCount: 0,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!reportId) return;

    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;
    let closed = false;

    const handleNamedEvent = (eventName: FastReportEvent["name"], data: string): boolean => {
      try {
        const parsed = JSON.parse(data) as FastReportEvent;
        // Server may emit a name we don't model yet; ignore rather than crash.
        const safe: FastReportEvent = KNOWN_EVENT_NAMES.has(parsed.name)
          ? parsed
          : { ...parsed, name: eventName };
        setState((s) => ({
          ...s,
          events: [...s.events, safe],
          latest: safe,
          connected: true,
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
          // Disable visibility-driven reconnect handling — the in-memory
          // emitter replays missed stages so we don't need the library
          // to refetch the whole history.
          openWhenHidden: true,
          onopen: async (response) => {
            if (response.ok) {
              setState((s) => ({ ...s, connected: true }));
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
            // aborts. Retry transparently — the emitter handles replay.
            if (closed) throw err;
            setState((s) => ({
              ...s,
              connected: false,
              errorCount: s.errorCount + 1,
            }));
          },
          onclose: () => {
            setState((s) => ({ ...s, connected: false }));
          },
        });
      } catch {
        // Final error after retry budget exhausted; state already shows
        // disconnected. Caller decides whether to refetch via polling.
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
