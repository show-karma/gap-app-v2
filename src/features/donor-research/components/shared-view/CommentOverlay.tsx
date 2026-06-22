"use client";

import pluralize from "pluralize";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { SharedReportCommentNode } from "@/types/donor-research-comments";

import { AnchoredAffordances } from "./AnchoredAffordances";
import { CommentComposer } from "./CommentComposer";
import { CommentRow } from "./CommentRow";
import { IdentityBadge } from "./IdentityBadge";
import { IdentityCaptureDialog } from "./IdentityCaptureDialog";
import { SelectionAffordance } from "./SelectionAffordance";
import { useCommenting } from "./useCommenting";

interface CommentOverlayProps {
  token: string;
  /** True when token has been revoked / expired — hides the overlay entirely. */
  reportRevoked?: boolean;
  /** True when the viewer's Privy session matches the report's advisor. */
  isAdvisor?: boolean;
  /**
   * True when the viewer carries any Privy session (advisor-or-not).
   * Used by the composer's identity gate: an authenticated viewer might
   * still be loading the `isAdvisor` resolution, so we defer to the BE
   * `requiresIdentity` round-trip instead of pre-opening the dialog.
   */
  isAuthenticated?: boolean;
  /**
   * True while the advisor-resolution query is in flight. When set, the
   * composer waits on the BE rather than opening the dialog optimistically
   * (race: user clicks submit before the /me query lands).
   */
  isAdvisorResolving?: boolean;
}

function totalCount(tree: SharedReportCommentNode[]): number {
  let n = 0;
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) break;
    n += 1;
    stack.push(...node.children);
  }
  return n;
}

/**
 * Comment overlay — sidebar listing all comment threads, pin badges
 * floating next to anchored targets, text-range highlights, an orphan
 * lane for anchors that no longer resolve in the live DOM, and the
 * composer (root + reply).
 *
 * Wires together {@link useCommenting} (state machine + mutations) and
 * {@link AnchoredAffordances} (per-target pins / "+" buttons / highlight
 * overlays). All anchor capture flows through {@link useCommenting} so
 * the floating "Comment" affordance, the section "+" buttons, and the
 * pin clicks all share one source of truth.
 *
 * aria-live="polite" region announces new comment additions per
 * DL-007 ("Comment added by X" / "Reply added by X").
 */
export function CommentOverlay({
  token,
  reportRevoked = false,
  isAdvisor = false,
  isAuthenticated = false,
  isAdvisorResolving = false,
}: CommentOverlayProps) {
  const commenting = useCommenting(token, {
    enabled: !reportRevoked,
    isAdvisor,
    isAuthenticated,
    isAdvisorResolving,
  });

  const {
    query,
    tree,
    identity,
    isPosting,
    composer,
    composerError,
    openRootComposer,
    openReplyComposer,
    closeComposer,
    sheetOpen,
    setSheetOpen,
    activatePin,
    counts,
    selectionAffordance,
    dismissSelectionAffordance,
    submitComposer,
    identityModalMode,
    setIdentityModalMode,
    retryPendingPost,
    scrollTargetCommentId,
    clearScrollTarget,
    highlightRefreshKey,
  } = commenting;

  const total = totalCount(tree);

  // Track previous total so we only fire the polite announcement on
  // additions (not on initial render or removals).
  const previousTotalRef = useRef(0);
  const lastRoot = tree[0];
  const lastReply = lastRoot?.children[lastRoot.children.length - 1];
  const announceText = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (total <= previousTotalRef.current) {
      previousTotalRef.current = total;
      return "";
    }
    previousTotalRef.current = total;
    const last = lastReply ?? lastRoot;
    if (!last) return "";
    const verb = last.parentCommentId ? "Reply added by" : "Comment added by";
    return `${verb} ${last.displayName}`;
  }, [total, lastRoot, lastReply]);

  // Scroll the matching root row into view whenever a pin is activated.
  const sheetBodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!scrollTargetCommentId) return;
    const id = scrollTargetCommentId;
    const t = setTimeout(() => {
      const container = sheetBodyRef.current;
      if (!container) return;
      const el = container.querySelector<HTMLElement>(`[data-comment-id="${id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      clearScrollTarget();
    }, 50);
    return () => clearTimeout(t);
  }, [scrollTargetCommentId, clearScrollTarget]);

  if (reportRevoked) return null;

  const composerHeader = composer.mode === "reply" ? composer.parent?.displayName : undefined;
  const composerAnchor = composer.mode === "root" ? composer.anchor : undefined;

  const orphanRoots = counts.orphanRoots;

  return (
    <>
      <AnchoredAffordances
        tree={tree}
        countsByKey={counts.byKey}
        highlightRefreshKey={highlightRefreshKey}
        onPinActivate={activatePin}
        onOpenRootComposer={openRootComposer}
      />

      {selectionAffordance && (
        <SelectionAffordance
          position={selectionAffordance.position}
          onClick={() => {
            openRootComposer(selectionAffordance.anchor);
            dismissSelectionAffordance();
          }}
        />
      )}

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <IdentityBadge
          displayName={identity.displayName}
          isAdvisor={identity.isAdvisor}
          onEditName={() => setIdentityModalMode("edit-name")}
          onSwitch={() => void identity.clearIdentity()}
        />
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="default" className="shadow-lg">
              {total === 0 ? "Comments" : pluralize("comment", total, true)}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Comments</SheetTitle>
            </SheetHeader>

            <div ref={sheetBodyRef} className="flex-1 overflow-y-auto pr-2">
              {query.isLoading && (
                <div className="space-y-3" data-testid="comments-loading">
                  <div className="h-16 animate-pulse rounded bg-muted" />
                  <div className="h-12 animate-pulse rounded bg-muted" />
                </div>
              )}
              {query.error && !query.isLoading && (
                <p className="text-sm text-destructive" role="alert">
                  Couldn’t load comments — retry coming up on next poll.
                </p>
              )}
              {!query.isLoading && !query.error && tree.length === 0 && (
                <p className="text-sm text-muted-foreground">Be the first to comment.</p>
              )}
              {tree.length > 0 && (
                <div className="space-y-3">
                  {tree.map((node) => (
                    <div key={node.id} data-comment-id={node.id}>
                      <CommentRow node={node} depth={0} onReply={openReplyComposer} />
                    </div>
                  ))}
                </div>
              )}

              {orphanRoots.length > 0 && (
                <section className="mt-6 border-t border-border pt-3" aria-label="Orphan comments">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {pluralize("orphan comment", orphanRoots.length, true)}
                  </h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    The highlighted text these comments referenced has changed; the original quotes
                    are preserved below.
                  </p>
                  <div className="space-y-3">
                    {orphanRoots.map((node) => (
                      <div key={node.id} data-comment-id={node.id} data-orphan>
                        {node.anchor && node.anchor.kind === "text_range" ? (
                          <blockquote className="mb-1 border-l-2 border-amber-400 pl-2 text-xs italic text-muted-foreground">
                            “{node.anchor.quote}”
                          </blockquote>
                        ) : null}
                        <CommentRow node={node} depth={0} onReply={openReplyComposer} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {composer.mode !== "closed" ? (
              <CommentComposer
                parentDisplayName={composerHeader}
                anchor={composerAnchor}
                externalError={composerError}
                isSubmitting={isPosting}
                onCancel={closeComposer}
                onSubmit={(body) => submitComposer(body)}
              />
            ) : null}
          </SheetContent>
        </Sheet>
      </div>

      <div aria-live="polite" className="sr-only" data-testid="comment-announce">
        {announceText}
      </div>

      <IdentityCaptureDialog
        open={identityModalMode !== null}
        nameOnly={identityModalMode === "edit-name"}
        isSubmitting={isPosting}
        onOpenChange={(open) => {
          if (!open) setIdentityModalMode(null);
        }}
        onSubmit={async (values) => {
          if (identityModalMode === "edit-name") {
            identity.refresh();
            setIdentityModalMode(null);
            return;
          }
          await retryPendingPost(values);
        }}
      />
    </>
  );
}
