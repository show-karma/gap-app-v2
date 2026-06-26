"use client";

import pluralize from "pluralize";
import { useEffect, useMemo, useRef } from "react";

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
  /**
   * The signed-in viewer's email (Privy email login), if any. When set,
   * the identity-capture dialog pre-fills and locks the email field
   * instead of asking for it. Null for anonymous viewers or wallet
   * logins with no email.
   */
  viewerEmail?: string | null;
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
  viewerEmail = null,
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
    retryFailed,
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
    activeCommentId,
    activateComment,
    clearActiveComment,
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

  // Chat-style: keep the newest comment in view. Scroll the sheet body to
  // the bottom when the sheet opens and whenever a new comment arrives —
  // unless a pin/highlight is currently steering the scroll to a specific
  // row (read via ref so clearing that target doesn't re-trigger us).
  const scrollTargetRef = useRef(scrollTargetCommentId);
  scrollTargetRef.current = scrollTargetCommentId;
  useEffect(() => {
    if (!sheetOpen || scrollTargetRef.current || total === 0) return;
    const scrollToEnd = () => {
      const container = sheetBodyRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    };
    // Fire twice: once promptly (new comment while already open) and once
    // after the sheet's slide-in + Radix focus settle, which otherwise
    // resets the scroll position to the top on first open.
    const t1 = setTimeout(scrollToEnd, 80);
    const t2 = setTimeout(scrollToEnd, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [sheetOpen, total]);

  // While the comments drawer is open, hide the global "Karma Assistant"
  // floating chat button. Its very high z-index (9999) otherwise keeps it
  // floating on top of the Sheet, which looks broken. We toggle the chat
  // button's fixed-positioned container's visibility and restore the prior
  // value on close / unmount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const chatButton = document.querySelector<HTMLElement>('button[aria-label="Open chat"]');
    if (!chatButton) return;
    // Prefer the nearest fixed-positioned ancestor (the chat widget's
    // floating container); fall back to the button itself.
    let target: HTMLElement = chatButton;
    let node: HTMLElement | null = chatButton;
    while (node) {
      if (typeof window !== "undefined" && window.getComputedStyle(node).position === "fixed") {
        target = node;
        break;
      }
      node = node.parentElement;
    }

    if (!sheetOpen) return;
    const previousVisibility = target.style.visibility;
    target.style.visibility = "hidden";
    return () => {
      target.style.visibility = previousVisibility;
    };
  }, [sheetOpen]);

  if (reportRevoked) return null;

  const composerHeader = composer.mode === "reply" ? composer.parent?.displayName : undefined;
  const composerAnchor = composer.mode === "root" ? composer.anchor : undefined;
  const composerGeneral = composer.mode === "root" ? composer.general === true : false;
  // Remount the always-on composer when its context changes so the body
  // input resets between general / specific-anchor / reply modes.
  const composerKey =
    composer.mode === "reply"
      ? `reply-${composer.parentCommentId}`
      : composer.mode === "root"
        ? `root-${composerAnchor ? JSON.stringify(composerAnchor) : "x"}`
        : "general";

  const orphanRoots = counts.orphanRoots;

  return (
    <>
      <AnchoredAffordances
        tree={tree}
        countsByKey={counts.byKey}
        highlightRefreshKey={highlightRefreshKey}
        onPinActivate={activatePin}
        onOpenRootComposer={openRootComposer}
        activeCommentId={activeCommentId}
        onActivateComment={activateComment}
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

      <div className="fixed bottom-24 left-6 z-40 flex flex-col items-start gap-2">
        <IdentityBadge
          displayName={identity.displayName}
          isAdvisor={identity.isAdvisor}
          onEditName={() => setIdentityModalMode("edit-name")}
          onSwitch={() => void identity.clearIdentity()}
        />
        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            // Closing the sheet drops the focus indicator on the
            // report's highlights so the donor doesn't see lingering
            // emphasis after dismissing the comment surface.
            if (!open) clearActiveComment();
          }}
        >
          <SheetTrigger asChild>
            <Button variant="default" className="shadow-lg">
              {total === 0 ? "Comments" : pluralize("comment", total, true)}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-full flex-col gap-4 sm:max-w-md">
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
                <div
                  className="flex flex-col items-start gap-2 rounded-md border border-border bg-muted/40 p-3"
                  role="alert"
                >
                  <p className="text-sm font-medium text-foreground">
                    We couldn’t load the comments
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Something went wrong on our end. Your connection is fine — we’ll keep trying, or
                    you can retry now.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void query.refetch()}
                    disabled={query.isFetching}
                  >
                    {query.isFetching ? "Retrying…" : "Try again"}
                  </Button>
                </div>
              )}
              {!query.isLoading && !query.error && tree.length === 0 && (
                <p className="text-sm text-muted-foreground">Be the first to comment.</p>
              )}
              {tree.length > 0 && (
                <div className="space-y-3">
                  {/* Roots arrive newest-first; render oldest-first so the
                      newest sits at the bottom (chat-style). Replies within
                      a thread are already oldest→newest. */}
                  {[...tree].reverse().map((node) => (
                    <div key={node.id} data-comment-id={node.id}>
                      <CommentRow
                        node={node}
                        depth={0}
                        onReply={openReplyComposer}
                        onRetry={retryFailed}
                        activeCommentId={activeCommentId}
                        onActivate={activateComment}
                      />
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
                        <CommentRow
                          node={node}
                          depth={0}
                          onReply={openReplyComposer}
                          activeCommentId={activeCommentId}
                          onActivate={activateComment}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <CommentComposer
              key={composerKey}
              parentDisplayName={composerHeader}
              anchor={composer.mode === "root" ? composerAnchor : undefined}
              general={composer.mode === "closed" ? true : composerGeneral}
              externalError={composerError}
              isSubmitting={isPosting}
              onCancel={closeComposer}
              onSubmit={(body) => submitComposer(body)}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div aria-live="polite" className="sr-only" data-testid="comment-announce">
        {announceText}
      </div>

      <IdentityCaptureDialog
        open={identityModalMode !== null}
        nameOnly={identityModalMode === "edit-name"}
        lockedEmail={viewerEmail}
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
