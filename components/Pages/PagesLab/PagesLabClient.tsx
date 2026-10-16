"use client";

import { MousePointerClick } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { HtmlReportFrame } from "@/components/Pages/Community/PortfolioReports/HtmlReportFrame";
import { Button } from "@/components/ui/button";
import { AgentPanel } from "./AgentPanel";
import type { BlockRef } from "./anchor";
import { PageCanvas } from "./PageCanvas";
import type { AgentResponse, Comment, Turn, Version } from "./types";

type StreamEvent =
  | { t: "delta"; text: string }
  | { t: "tool"; name: string; detail: string }
  | { t: "done"; html: string; note: string; model?: string }
  | { t: "error"; message: string };

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) onEvent(JSON.parse(line.slice(6)) as StreamEvent);
    }
  }
}

const shortModel = (id: string) =>
  id.includes("haiku") ? "Haiku" : id.includes("opus") ? "Opus" : "Sonnet";

function toolStatus(name: string, detail: string): string {
  if (name === "karma_api_search_docs") return `Searching the API for "${detail}"…`;
  if (name === "karma_get") return `Reading ${detail}…`;
  return `Looking up ${detail}…`;
}

const newId = () => Math.random().toString(36).slice(2, 10);

export function PagesLabClient() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [blocks, setBlocks] = useState<BlockRef[]>([]);
  const [pending, setPending] = useState<{ id: string; label: string } | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dryPrompt, setDryPrompt] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [model, setModel] = useState("claude-sonnet-5-5");
  const [streamHtml, setStreamHtml] = useState<string | null>(null);
  const bufferRef = useRef("");

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => {
      const buffered = bufferRef.current;
      if (buffered.includes("</head>")) setStreamHtml(buffered);
    }, 300);
    return () => window.clearInterval(timer);
  }, [busy]);

  const current = versions.find((version) => version.id === currentVersionId) ?? null;
  const html = current?.html ?? null;

  const onBlocksChange = useCallback((next: BlockRef[]) => setBlocks(next), []);
  const onSelectComment = useCallback((id: string) => setSelectedCommentId(id), []);
  const onMarkBlock = useCallback((block: { id: string; label: string }) => {
    setPending(block);
    setArmed(false);
  }, []);

  const send = async (prompt: string): Promise<boolean> => {
    const openComments = comments.filter((comment) => comment.status === "open");
    const turnId = newId();

    setBusy(true);
    setDryPrompt(null);
    bufferRef.current = "";
    setStreamHtml(null);
    setTurns((list) => [
      ...list,
      {
        id: turnId,
        prompt: prompt.length > 0 ? prompt : "Apply the pinned comments",
        pinnedCount: openComments.length,
        status: "working",
        statusText: "Thinking…",
      },
    ]);

    const patch = (fields: Partial<Turn>) =>
      setTurns((list) => list.map((turn) => (turn.id === turnId ? { ...turn, ...fields } : turn)));

    const commit = (result: { html: string; note: string; model?: string }) => {
      const version: Version = {
        id: newId(),
        html: result.html,
        note: result.note || "applied pinned comments",
        createdAt: Date.now(),
      };
      setVersions((list) => {
        patch({
          status: "done",
          versionLabel: `v${list.length + 1}`,
          modelLabel: shortModel(result.model ?? model),
          statusText: undefined,
        });
        return [...list, version];
      });
      setCurrentVersionId(version.id);
      setComments((list) =>
        list.map((comment) =>
          comment.status === "open" ? { ...comment, status: "applied" as const } : comment
        )
      );
      setSelectedCommentId(null);
    };

    try {
      const response = await fetch("/api/pages-lab/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          html,
          comments: openComments.map((comment) => ({
            id: comment.anchor.id,
            label: comment.anchor.label,
            body: comment.body,
          })),
        }),
      });

      if (!response.headers.get("content-type")?.includes("event-stream")) {
        const result = (await response.json()) as AgentResponse;
        if (result.kind === "dry") {
          setDryPrompt(result.prompt);
          patch({ status: "done", versionLabel: "prompt", statusText: undefined });
          return true;
        }
        patch({
          status: "failed",
          error: result.kind === "error" ? result.message : "Unexpected response",
        });
        return false;
      }

      if (!response.body) throw new Error("No stream");

      let settled = false;

      await consumeStream(response.body, (event) => {
        if (event.t === "delta") {
          bufferRef.current += event.text;
          patch({ statusText: "Writing the page…" });
          return;
        }
        if (event.t === "tool") {
          patch({ statusText: toolStatus(event.name, event.detail) });
          return;
        }
        if (event.t === "done") {
          settled = true;
          commit({ html: event.html, note: event.note, model: event.model });
          return;
        }
        settled = true;
        patch({ status: "failed", error: event.message, statusText: undefined });
      });

      if (!settled) {
        patch({ status: "failed", error: "The stream ended early", statusText: undefined });
        return false;
      }

      return true;
    } catch (cause) {
      patch({
        status: "failed",
        error: cause instanceof Error ? cause.message : "Request failed",
        statusText: undefined,
      });
      return false;
    } finally {
      setBusy(false);
      setStreamHtml(null);
      bufferRef.current = "";
    }
  };

  const editComment = (commentId: string, body: string) =>
    setComments((list) =>
      list.map((comment) => (comment.id === commentId ? { ...comment, body } : comment))
    );

  const dropComment = (commentId: string) =>
    setComments((list) => list.filter((comment) => comment.id !== commentId));

  const addComment = (body: string) => {
    if (!pending) return;
    const comment: Comment = {
      id: newId(),
      anchor: { id: pending.id, label: pending.label },
      body,
      status: "open",
    };
    setComments((list) => [...list, comment]);
    setSelectedCommentId(comment.id);
    setPending(null);
  };

  return (
    <div
      className="kp-studio flex h-screen min-h-0 flex-col"
      style={{ background: "var(--kp-ground-deep)", color: "var(--kp-ink)" }}
    >
      <header
        className="flex shrink-0 items-center gap-4 px-5 py-3"
        style={{ borderBottom: "1px solid var(--kp-line)" }}
      >
        <h1 className="font-semibold text-sm tracking-tight" style={{ color: "var(--kp-ink)" }}>
          Karma Panels
        </h1>

        {html ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setArmed((value) => !value)}
            className="ml-auto flex items-center gap-2 text-xs"
            style={
              armed
                ? { background: "var(--kp-accent)", color: "var(--kp-accent-ink)" }
                : {
                    background: "var(--kp-panel)",
                    color: "var(--kp-ink-soft)",
                    border: "1px solid var(--kp-line-strong)",
                  }
            }
          >
            <MousePointerClick className="size-3.5" aria-hidden />
            {armed ? "Click a block" : "Comment on a block"}
          </Button>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main
          className="kp-scroll min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8"
          style={{ background: "var(--kp-ground)" }}
        >
          {streamHtml !== null ? (
            <div
              className="mx-auto w-full max-w-[920px] overflow-hidden rounded-xl"
              style={{
                background: "var(--kp-sheet)",
                color: "var(--kp-sheet-ink)",
                boxShadow: "var(--kp-sheet-shadow)",
              }}
            >
              <HtmlReportFrame html={streamHtml} title="Panel preview, still writing" />
            </div>
          ) : html === null ? (
            <div className="flex h-full items-center justify-center">
              <p
                className="max-w-xs text-balance text-center text-sm leading-relaxed"
                style={{ color: "var(--kp-ink-faint)" }}
              >
                Your panel appears here once Karma AI writes it.
              </p>
            </div>
          ) : (
            <PageCanvas
              html={html}
              armed={armed}
              comments={comments}
              selectedCommentId={selectedCommentId}
              pending={pending}
              onMarkBlock={onMarkBlock}
              onSelectComment={onSelectComment}
              onBlocksChange={onBlocksChange}
              onAddComment={addComment}
              onCancelPending={() => setPending(null)}
              onEditComment={editComment}
              onDropComment={dropComment}
            />
          )}
        </main>

        <div className="h-[46vh] w-full shrink-0 lg:h-auto lg:w-[360px]">
          <AgentPanel
            blocks={blocks}
            comments={comments}
            versions={versions}
            turns={turns}
            currentVersionId={currentVersionId}
            selectedCommentId={selectedCommentId}
            busy={busy}
            model={model}
            onModelChange={setModel}
            hasPage={html !== null}
            dryPrompt={dryPrompt}
            onSend={send}
            onSelectComment={onSelectComment}
            onDropComment={dropComment}
            onRevert={(versionId) => setCurrentVersionId(versionId)}
            onDismissDry={() => setDryPrompt(null)}
          />
        </div>
      </div>
    </div>
  );
}
