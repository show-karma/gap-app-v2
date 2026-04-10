"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useRef } from "react";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { useGrantAtlasStore } from "../store/philanthropy-chat";
import type { QueryResponse } from "../types/philanthropy";

const DEFAULT_PAGE_SIZE = 50;

interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

function parseSSEChunk(chunk: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const blocks = chunk.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n");
    let data = "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        data += (data ? "\n" : "") + line.slice(6);
      }
    }

    if (data) {
      try {
        events.push(JSON.parse(data));
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return events;
}

function toFriendlyError(status: number): string {
  switch (status) {
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 503:
      return "Service temporarily unavailable. Please try again in a few minutes.";
    default:
      if (status >= 500) return "Something went wrong. Please try again.";
      return "Something unexpected happened. Please try again.";
  }
}

async function fetchSync(query: string, page: number): Promise<QueryResponse> {
  const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.PHILANTHROPY.QUERY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: query, page, limit: DEFAULT_PAGE_SIZE }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = toFriendlyError(response.status);
    try {
      const errorJson = JSON.parse(errorText) as { message?: string; error?: string };
      const rawMsg = errorJson.message || errorJson.error;
      if (rawMsg?.trim()) errorMsg = rawMsg.trim();
    } catch {
      if (errorText.trim()) errorMsg = errorText.trim();
    }
    throw new Error(errorMsg);
  }
  return response.json() as Promise<QueryResponse>;
}

async function fetchStream(
  query: string,
  page: number,
  signal: AbortSignal,
  onNarrative: (text: string) => void
): Promise<boolean> {
  const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.PHILANTHROPY.QUERY_STREAM}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: query, page, limit: DEFAULT_PAGE_SIZE }),
    signal,
  });

  if (!response.ok) return false; // Signal caller to fall back to sync

  const reader = response.body?.getReader();
  if (!reader) return false;

  const decoder = new TextDecoder();
  let buffer = "";
  let narrative = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = parseSSEChunk(buffer);

    const lastNewlines = buffer.lastIndexOf("\n\n");
    if (lastNewlines >= 0) {
      buffer = buffer.slice(lastNewlines + 2);
    }

    for (const event of events) {
      if (event.type === "chunk" && typeof event.content === "string") {
        narrative += event.content;
        onNarrative(narrative);
      } else if (event.type === "error") {
        throw new Error((event.message as string) || "Search failed");
      }
    }
  }

  return true; // Stream succeeded
}

export function usePhilanthropySearch() {
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string, page = 1) => {
    const store = useGrantAtlasStore.getState();

    store.setQuery(query);
    store.setNarrative("");
    store.setResult(null);
    store.setSearching(true);
    store.setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Try streaming narrative first, fall back to sync if unavailable
      let streamed = false;
      try {
        streamed = await fetchStream(query, page, controller.signal, (text) => {
          store.setNarrative(text);
        });
      } catch (streamErr) {
        // Re-throw aborts, swallow other stream errors to try sync
        if (streamErr instanceof DOMException && streamErr.name === "AbortError") throw streamErr;
        Sentry.captureException(streamErr, { extra: { context: "philanthropy-stream" } });
      }

      // Always fetch full results via sync endpoint (entities + citations + intent)
      const syncData = await fetchSync(query, page);
      store.setResult({
        entities: syncData.entities,
        citations: syncData.citations,
        intent: syncData.intent,
        pagination: syncData.pagination,
      });

      // If streaming didn't produce a narrative, use the sync one
      if (!streamed && syncData.narrative) {
        store.setNarrative(syncData.narrative);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      let msg = err instanceof Error ? err.message : "Failed to connect";
      if (err instanceof TypeError && msg === "Failed to fetch") {
        msg = "Unable to reach the server. Please check your connection and try again.";
      }
      useGrantAtlasStore.getState().setError(msg);
    } finally {
      useGrantAtlasStore.getState().setSearching(false);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { search, abort };
}
