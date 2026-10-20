"use client";

import { ArrowLeft, MousePointerClick } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HtmlReportFrame } from "@/components/Pages/Community/PortfolioReports/HtmlReportFrame";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import {
  useCreatePanelComment,
  useDeletePanelComment,
  usePanel,
  usePanelVersion,
  useUpdatePanel,
  useUpdatePanelComment,
} from "@/hooks/panels/usePanels";
import { usePanelTurn } from "@/hooks/panels/usePanelTurn";
import { Link } from "@/src/components/navigation/Link";
import type { PanelModelId } from "@/types/panels";
import { PAGES } from "@/utilities/pages";
import { AgentPanel } from "./AgentPanel";
import type { BlockRef } from "./anchor";
import { PageCanvas } from "./PageCanvas";

interface Props {
  communityId: string;
  panelId: string;
}

const PREVIEW_TICK_MS = 300;

export function PanelStudio({ communityId, panelId }: Props) {
  const { data: detail, isLoading, isError, refetch } = usePanel(communityId, panelId);
  const updatePanel = useUpdatePanel(communityId, panelId);
  const createComment = useCreatePanelComment(communityId, panelId);
  const updateComment = useUpdatePanelComment(communityId, panelId);
  const deleteComment = useDeletePanelComment(communityId, panelId);
  const { busy, preview, send } = usePanelTurn(communityId, panelId);

  const [blocks, setBlocks] = useState<BlockRef[]>([]);
  const [pending, setPending] = useState<{ id: string; label: string } | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [model, setModel] = useState<PanelModelId>("claude-sonnet-5-5");
  const [streamHtml, setStreamHtml] = useState<string | null>(null);

  const currentVersionId = detail?.panel.currentVersionId ?? null;
  const cachedCurrent =
    detail?.currentVersion && detail.currentVersion.id === currentVersionId
      ? detail.currentVersion
      : null;
  // A revert points at a version the detail payload does not carry; fetch it.
  const { data: revertedVersion, isLoading: versionLoading } = usePanelVersion(
    communityId,
    panelId,
    currentVersionId,
    { enabled: cachedCurrent === null && currentVersionId !== null }
  );
  const version = cachedCurrent ?? revertedVersion ?? null;
  const html = version?.html ?? null;

  useEffect(() => {
    if (!busy) {
      setStreamHtml(null);
      return;
    }
    const timer = window.setInterval(() => {
      if (preview.html) {
        setStreamHtml(preview.html);
        return;
      }
      if (preview.buffer.includes("</head>")) setStreamHtml(preview.buffer);
    }, PREVIEW_TICK_MS);
    return () => window.clearInterval(timer);
  }, [busy, preview.buffer, preview.html]);

  const comments = useMemo(() => detail?.comments ?? [], [detail?.comments]);

  const onBlocksChange = useCallback((next: BlockRef[]) => setBlocks(next), []);
  const onSelectComment = useCallback((id: string) => setSelectedCommentId(id), []);
  const onMarkBlock = useCallback((block: { id: string; label: string }) => {
    setPending(block);
    setArmed(false);
  }, []);

  const sendTurn = async (prompt: string): Promise<boolean> => {
    const commentIds = comments
      .filter((comment) => comment.status === "open")
      .map((comment) => comment.id);
    const ok = await send({ prompt, modelId: model, commentIds });
    if (ok) setSelectedCommentId(null);
    return ok;
  };

  const addComment = (body: string) => {
    if (!pending || !version) return;
    createComment.mutate({
      versionId: version.id,
      blockId: pending.id,
      blockLabel: pending.label,
      body,
    });
    setPending(null);
  };

  const editComment = (commentId: string, body: string) =>
    updateComment.mutate({ commentId, body });
  const dropComment = (commentId: string) => {
    deleteComment.mutate(commentId);
    if (selectedCommentId === commentId) setSelectedCommentId(null);
  };

  if (isLoading) {
    return (
      <output aria-label="Loading panel" className="flex h-screen items-center justify-center">
        <Spinner />
      </output>
    );
  }

  if (isError || !detail) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">This panel could not be loaded.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={PAGES.ADMIN.PANELS(communityId)}>Back to panels</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="kp-studio flex h-screen min-h-0 flex-col"
      style={{ background: "var(--kp-ground-deep)", color: "var(--kp-ink)" }}
    >
      <header
        className="flex shrink-0 items-center gap-3 px-5 py-3"
        style={{ borderBottom: "1px solid var(--kp-line)" }}
      >
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back to panels">
          <Link href={PAGES.ADMIN.PANELS(communityId)}>
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <h1
          className="truncate font-semibold text-sm tracking-tight"
          style={{ color: "var(--kp-ink)" }}
        >
          {detail.panel.title}
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
              {versionLoading ? (
                <Spinner />
              ) : (
                <p
                  className="max-w-xs text-balance text-center text-sm leading-relaxed"
                  style={{ color: "var(--kp-ink-faint)" }}
                >
                  Your panel appears here once Karma AI writes it.
                </p>
              )}
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
            versions={detail.versions}
            turns={detail.turns}
            currentVersionId={currentVersionId}
            selectedCommentId={selectedCommentId}
            busy={busy}
            model={model}
            onModelChange={setModel}
            hasPage={html !== null}
            onSend={sendTurn}
            onSelectComment={onSelectComment}
            onDropComment={dropComment}
            onRevert={(versionId) => updatePanel.mutate({ currentVersionId: versionId })}
          />
        </div>
      </div>
    </div>
  );
}
