import { useEffect, useRef, useState } from "react";
import type { FastReportEvent } from "@/types/donor-research";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

interface StreamState {
  events: FastReportEvent[];
  latest: FastReportEvent | null;
  /** EventSource readyState; null when not connected. */
  readyState: number | null;
  errorCount: number;
}

const TERMINAL_EVENT_NAMES = new Set(["report_finalized", "report_failed"]);

/**
 * Subscribes to the SSE progress stream for a Fast/Deep report. Re-
 * connects automatically on transient errors (browsers' native
 * `EventSource` already retries on connection drop; this hook also
 * tolerates server-side 5xx by recreating the source).
 *
 * Returns the full ordered event list (for replay UIs) plus the latest
 * event (for status banners). Caller decides when to render — there is
 * no implicit suspense behavior.
 *
 * The hook intentionally does NOT hit `useQueryClient` — SSE is a
 * push channel, while `useDonorReport` already polls until terminal.
 * Keeping the two paths independent avoids cache thrash when both fire
 * simultaneously during a report run.
 */
export function useDonorReportStream(reportId: string | null) {
  const [state, setState] = useState<StreamState>({
    events: [],
    latest: null,
    readyState: null,
    errorCount: 0,
  });
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    let source: EventSource | null = null;

    const eventNames: FastReportEvent["name"][] = [
      "snapshot",
      "pool_loaded",
      "compliance_complete",
      "contact_discovery_complete",
      "activity_complete",
      "ranking_complete",
      "report_finalized",
      "report_failed",
    ];

    const handleEvent = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as FastReportEvent;
        setState((s) => ({
          ...s,
          events: [...s.events, parsed],
          latest: parsed,
          readyState: source?.readyState ?? null,
        }));
        if (TERMINAL_EVENT_NAMES.has(parsed.name)) {
          source?.close();
        }
      } catch {
        // Malformed payload — drop the event but keep the stream open
        // so subsequent events still arrive.
      }
    };

    // EventSource can't set Authorization headers (browser limitation),
    // so the indexer's auth middleware accepts the Privy JWT as an
    // `?access_token=` query parameter for routes ending in /stream
    // (RFC 6750 §2.3). Without this every SSE connection 401s and the
    // browser drops into an infinite reconnect loop.
    (async () => {
      const token = await TokenManager.getToken().catch(() => null);
      if (cancelled) return;
      const baseUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
      const base = `${baseUrl}${INDEXER.DONOR_RESEARCH.REPORT_STREAM(reportId)}`;
      const url = token
        ? `${base}${base.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`
        : base;
      source = new EventSource(url, { withCredentials: true });
      sourceRef.current = source;
      setState((s) => ({ ...s, readyState: source!.readyState }));
      for (const name of eventNames) {
        source.addEventListener(name, handleEvent as EventListener);
      }
      source.onerror = () => {
        setState((s) => ({
          ...s,
          readyState: source?.readyState ?? null,
          errorCount: s.errorCount + 1,
        }));
      };
    })();

    return () => {
      cancelled = true;
      source?.close();
      sourceRef.current = null;
    };
  }, [reportId]);

  return state;
}
