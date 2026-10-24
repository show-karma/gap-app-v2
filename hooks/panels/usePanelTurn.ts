"use client";

import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { panelTurnsUrl } from "@/services/panels.service";
import type { PanelDetail, PanelTurnRequest } from "@/types/panels";
import { TokenManager } from "@/utilities/auth/token-manager";
import {
  INITIAL_PREVIEW,
  type PanelPreview,
  parsePanelStreamEvent,
  reducePanelDetail,
  reducePanelPreview,
} from "./panel-stream";
import { panelKeys } from "./usePanels";

interface PanelTurnResult {
  busy: boolean;
  preview: PanelPreview;
  send: (body: PanelTurnRequest) => Promise<boolean>;
}

/**
 * Runs one agent turn over SSE and folds every event into the cached
 * `PanelDetail`, so the studio reads turns, versions and comments from React
 * Query only. The preview buffer is local: it is a transient rendering aid,
 * never state the server knows about.
 */
export function usePanelTurn(community: string, panelId: string): PanelTurnResult {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PanelPreview>(INITIAL_PREVIEW);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (body: PanelTurnRequest): Promise<boolean> => {
      const detailKey = panelKeys.detail(community, panelId);
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      setBusy(true);
      setPreview(INITIAL_PREVIEW);

      let settled = false;
      let failed = false;
      let streamError: string | null = null;

      try {
        const token = await TokenManager.getToken().catch(() => null);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        await fetchEventSource(panelTurnsUrl(community, panelId), {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          credentials: "omit",
          signal: controller.signal,
          openWhenHidden: true,
          onopen: async (response) => {
            if (response.ok) return;
            const text = await response.text().catch(() => "");
            throw new Error(text || `Turn request failed: ${response.status}`);
          },
          onmessage: (message) => {
            const event = parsePanelStreamEvent(message.event, message.data);
            if (!event) return;
            setPreview((current) => reducePanelPreview(current, event));
            queryClient.setQueryData<PanelDetail>(detailKey, (old) =>
              old ? reducePanelDetail(old, event) : old
            );
            if (event.name === "done" || event.name === "error") {
              settled = true;
              failed = event.name === "error";
              controller.abort();
            }
          },
          onclose: () => {
            if (!settled) streamError = "The stream ended early";
          },
          onerror: (error) => {
            throw error;
          },
        });
      } catch (error) {
        if (!settled) {
          failed = true;
          streamError =
            error instanceof Error && error.name !== "AbortError"
              ? error.message
              : (streamError ?? "Request failed");
        }
      } finally {
        setBusy(false);
        setPreview((current) =>
          current.settled ? current : { ...current, settled: true, error: streamError }
        );
        void queryClient.invalidateQueries({ queryKey: detailKey });
        void queryClient.invalidateQueries({ queryKey: panelKeys.all(community) });
      }

      return settled && !failed;
    },
    [community, panelId, queryClient]
  );

  return { busy, preview, send };
}
