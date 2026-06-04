import { useEffect, useRef, useState } from "react";
import type { FastReportEvent } from "@/types/donor-research";
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
    const baseUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
    const url = `${baseUrl}${INDEXER.DONOR_RESEARCH.REPORT_STREAM(reportId)}`;
    const source = new EventSource(url, { withCredentials: true });
    sourceRef.current = source;

    setState((s) => ({ ...s, readyState: source.readyState }));

    const handleEvent = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as FastReportEvent;
        setState((s) => ({
          ...s,
          events: [...s.events, parsed],
          latest: parsed,
          readyState: source.readyState,
        }));
        if (TERMINAL_EVENT_NAMES.has(parsed.name)) {
          source.close();
        }
      } catch {
        // Malformed payload — drop the event but keep the stream open
        // so subsequent events still arrive.
      }
    };

    // The server emits each event with `event: <name>` headers + a JSON
    // data line. Attach listeners for each known event so the
    // generic `onmessage` doesn't have to demultiplex.
    const eventNames: FastReportEvent["name"][] = [
      "snapshot",
      "pool_loaded",
      "compliance_complete",
      "activity_complete",
      "ranking_complete",
      "report_finalized",
      "report_failed",
    ];
    for (const name of eventNames) {
      source.addEventListener(name, handleEvent as EventListener);
    }

    source.onerror = () => {
      setState((s) => ({
        ...s,
        readyState: source.readyState,
        errorCount: s.errorCount + 1,
      }));
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [reportId]);

  return state;
}
