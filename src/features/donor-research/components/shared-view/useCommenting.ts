"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { useCommenterIdentity } from "@/hooks/useCommenterIdentity";
import { useSharedReportComments } from "@/hooks/useSharedReportComments";
import { captureTextRangeAnchor } from "@/src/features/donor-research/components/anchor/capture";
import { resolveAnchor } from "@/src/features/donor-research/components/anchor/resolve";
import type { CommentAnchor } from "@/src/features/donor-research/components/anchor/types";
import {
  type CreateCommentRequest,
  IdempotencyCollisionError,
  IdentityRequiredError,
  RateLimitedError,
  type SharedReportCommentNode,
} from "@/types/donor-research-comments";

interface SelectionAffordance {
  /** Anchor captured at the moment the user released the selection. */
  anchor: CommentAnchor;
  /** Document-coordinate position for the floating Comment button. */
  position: { top: number; left: number };
}

interface CountsByTarget {
  /** key = `${targetKind}:${targetId}` — counts root + descendant comments. */
  byKey: Map<string, number>;
  /** Root nodes scoped to each key, used for "scroll into view" navigation. */
  rootsByKey: Map<string, SharedReportCommentNode[]>;
  /** Orphan-lane roots whose anchor failed to resolve in the current DOM. */
  orphanRoots: SharedReportCommentNode[];
}

function totalDescendants(node: SharedReportCommentNode): number {
  let n = 1;
  for (const c of node.children) n += totalDescendants(c);
  return n;
}

function targetKeyOf(anchor: CommentAnchor | null): string | null {
  if (!anchor) return null;
  if (anchor.kind === "section") return `section:${anchor.sectionKey}`;
  if (anchor.kind === "candidate") return `candidate:${anchor.candidateId}`;
  return `${anchor.targetKind}:${anchor.targetId}`;
}

export interface UseCommentingResult {
  /** React Query handle around the shared comments endpoint. */
  query: ReturnType<typeof useSharedReportComments>["query"];
  /** Assembled comment tree. */
  tree: SharedReportCommentNode[];
  /** Identity helpers (display name, advisor flag, switch action). */
  identity: ReturnType<typeof useCommenterIdentity>;
  /** True while the post mutation is in flight. */
  isPosting: boolean;
  /** Latest mutation error, captured for the composer to surface. */
  composerError: string | null;
  /** Imperative composer state, keyed by anchor or "root". */
  composer:
    | { mode: "closed" }
    | { mode: "root"; anchor: CommentAnchor }
    | { mode: "reply"; parentCommentId: string; parent: SharedReportCommentNode | null };
  /** Open a root composer for the supplied anchor. */
  openRootComposer: (anchor: CommentAnchor) => void;
  /** Open a reply composer for the supplied parent comment. */
  openReplyComposer: (parentCommentId: string) => void;
  /** Close any open composer. */
  closeComposer: () => void;
  /** Sidebar open / closed state. */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  /** Pin click handler — opens the sheet and scrolls the matching root into view. */
  activatePin: (targetKey: string) => void;
  /** Lookup table for pin badges + orphan rendering. */
  counts: CountsByTarget;
  /** Floating "Comment" affordance state derived from text selection. */
  selectionAffordance: SelectionAffordance | null;
  /** Dismiss the floating "Comment" affordance (e.g. after the user clicks it). */
  dismissSelectionAffordance: () => void;
  /** Submit handler called by CommentComposer. Wraps the mutation. */
  submitComposer: (
    body: string,
    extraIdentity?: { displayName?: string; email?: string }
  ) => Promise<void>;
  /** Identity dialog mode (null = closed, "post" = capture before retry, "edit-name" = edit-only). */
  identityModalMode: "post" | "edit-name" | null;
  setIdentityModalMode: (mode: "post" | "edit-name" | null) => void;
  /** When the identity dialog resolves we replay the pending post with the new values. */
  retryPendingPost: (values: { displayName: string; email: string }) => Promise<void>;
  /** Imperative scroll target — a ref set when a pin is activated. */
  scrollTargetCommentId: string | null;
  /** Clears the scroll target after the consumer has used it. */
  clearScrollTarget: () => void;
  /** Refresh key for the highlight resolver — bumps on each successful poll. */
  highlightRefreshKey: number;
}

const SELECTION_DEBOUNCE_MS = 80;

/**
 * Orchestration hook for the donor-shared report comment surface. Owns
 * the composer state machine, the floating-affordance state derived
 * from text selection inside anchorable regions, the identity dialog
 * gating, and the bridge to the React Query polling layer.
 *
 * Why this lives in `shared-view/` rather than `hooks/`: it composes
 * `useSharedReportComments` + `useCommenterIdentity` and is only
 * meaningful inside the donor-share UI tree. Hoisting it would tempt
 * other surfaces to depend on the FE proxy and the shared-report
 * cookie scope, neither of which apply elsewhere.
 */
export function useCommenting(
  token: string,
  opts: { enabled?: boolean; isAdvisor?: boolean } = {}
): UseCommentingResult {
  const enabled = opts.enabled !== false;
  const isAdvisor = opts.isAdvisor ?? false;

  const { query, tree, postComment } = useSharedReportComments(token, { enabled });
  const identity = useCommenterIdentity(token, isAdvisor);

  const [composer, setComposer] = useState<UseCommentingResult["composer"]>({
    mode: "closed",
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [identityModalMode, setIdentityModalMode] = useState<"post" | "edit-name" | null>(null);
  const [pendingPost, setPendingPost] = useState<CreateCommentRequest | null>(null);
  const [scrollTargetCommentId, setScrollTargetCommentId] = useState<string | null>(null);
  const [selectionAffordance, setSelectionAffordance] = useState<SelectionAffordance | null>(null);
  const [highlightRefreshKey, setHighlightRefreshKey] = useState(0);

  // Bump the highlight refresh key whenever a new payload lands so the
  // resolver re-runs against the freshly rendered DOM.
  useEffect(() => {
    if (query.data) setHighlightRefreshKey((n) => n + 1);
  }, [query.data]);

  const counts = useMemo<CountsByTarget>(() => {
    const byKey = new Map<string, number>();
    const rootsByKey = new Map<string, SharedReportCommentNode[]>();
    const orphans: SharedReportCommentNode[] = [];
    if (typeof document === "undefined") {
      return { byKey, rootsByKey, orphanRoots: orphans };
    }
    const root = document.querySelector("[data-brief]");
    for (const node of tree) {
      if (!node.anchor) {
        orphans.push(node);
        continue;
      }
      const key = targetKeyOf(node.anchor);
      if (!key) continue;
      // Treat unresolved text-range anchors as orphaned.
      if (root && node.anchor.kind === "text_range") {
        const resolved = resolveAnchor(node.anchor, root);
        if (resolved.kind === "orphan") {
          orphans.push(node);
          continue;
        }
      }
      const count = totalDescendants(node);
      byKey.set(key, (byKey.get(key) ?? 0) + count);
      const bucket = rootsByKey.get(key) ?? [];
      bucket.push(node);
      rootsByKey.set(key, bucket);
    }
    return { byKey, rootsByKey, orphanRoots: orphans };
  }, [tree, highlightRefreshKey]);

  // Text-selection listener — fires the floating Comment affordance
  // when the user releases a non-empty selection inside an anchorable
  // ancestor. Debounced so dragging doesn't thrash state.
  const selectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleSelection = () => {
      if (selectionTimer.current) clearTimeout(selectionTimer.current);
      selectionTimer.current = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setSelectionAffordance(null);
          return;
        }
        const anchor = captureTextRangeAnchor(sel);
        if (!anchor) {
          setSelectionAffordance(null);
          return;
        }
        const range = sel.getRangeAt(0);
        const rects = range.getClientRects();
        const last = rects[rects.length - 1];
        if (!last) {
          setSelectionAffordance(null);
          return;
        }
        setSelectionAffordance({
          anchor,
          position: {
            top: last.bottom + window.scrollY + 4,
            left: last.right + window.scrollX - 16,
          },
        });
      }, SELECTION_DEBOUNCE_MS);
    };

    document.addEventListener("selectionchange", handleSelection);
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);
    return () => {
      if (selectionTimer.current) clearTimeout(selectionTimer.current);
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
    };
  }, []);

  const dismissSelectionAffordance = useCallback(() => {
    setSelectionAffordance(null);
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    sel?.removeAllRanges();
  }, []);

  const openRootComposer = useCallback((anchor: CommentAnchor) => {
    setComposerError(null);
    setComposer({ mode: "root", anchor });
    setSheetOpen(true);
  }, []);

  const openReplyComposer = useCallback(
    (parentCommentId: string) => {
      setComposerError(null);
      const findNode = (nodes: SharedReportCommentNode[]): SharedReportCommentNode | null => {
        for (const n of nodes) {
          if (n.id === parentCommentId) return n;
          const inChildren = findNode(n.children);
          if (inChildren) return inChildren;
        }
        return null;
      };
      setComposer({
        mode: "reply",
        parentCommentId,
        parent: findNode(tree),
      });
      setSheetOpen(true);
    },
    [tree]
  );

  const closeComposer = useCallback(() => {
    setComposer({ mode: "closed" });
    setComposerError(null);
  }, []);

  const activatePin = useCallback(
    (targetKey: string) => {
      const roots = counts.rootsByKey.get(targetKey) ?? [];
      const first = roots[0];
      setSheetOpen(true);
      if (first) setScrollTargetCommentId(first.id);
    },
    [counts.rootsByKey]
  );

  const clearScrollTarget = useCallback(() => {
    setScrollTargetCommentId(null);
  }, []);

  const performPost = useCallback(
    async (request: CreateCommentRequest) => {
      setComposerError(null);
      try {
        await postComment.mutateAsync({ request, idempotencyKey: uuidv4() });
        setComposer({ mode: "closed" });
        setSelectionAffordance(null);
      } catch (err) {
        if (err instanceof IdentityRequiredError) {
          setPendingPost(request);
          setIdentityModalMode("post");
          return;
        }
        if (err instanceof RateLimitedError) {
          setComposerError(`Slow down — try again in ${err.retryAfter}s.`);
          return;
        }
        if (err instanceof IdempotencyCollisionError) {
          setComposerError("That submission was already received — try again.");
          return;
        }
        setComposerError("Something went wrong. Try again.");
      }
    },
    [postComment]
  );

  const submitComposer = useCallback(
    async (body: string, extraIdentity?: { displayName?: string; email?: string }) => {
      if (composer.mode === "closed") return;
      const baseDisplayName = extraIdentity?.displayName ?? identity.displayName ?? "";
      const request: CreateCommentRequest =
        composer.mode === "reply"
          ? {
              body,
              displayName: baseDisplayName,
              parentCommentId: composer.parentCommentId,
              ...(extraIdentity?.email ? { email: extraIdentity.email } : {}),
            }
          : {
              body,
              displayName: baseDisplayName,
              anchor: composer.anchor,
              ...(extraIdentity?.email ? { email: extraIdentity.email } : {}),
            };
      // Gate the post on identity. Without a captured name (and not an
      // advisor), the BE's schema validation rejects with a generic 400
      // *before* the controller can return `requiresIdentity: true` —
      // which used to surface as "Something went wrong" in the composer.
      // Open the IdentityCaptureDialog first and stash the request so
      // `retryPendingPost` can replay it with the captured values.
      if (!extraIdentity && !identity.isAdvisor && !baseDisplayName) {
        setPendingPost(request);
        setIdentityModalMode("post");
        return;
      }
      await performPost(request);
    },
    [composer, identity.displayName, identity.isAdvisor, performPost]
  );

  const retryPendingPost = useCallback(
    async (values: { displayName: string; email: string }) => {
      if (!pendingPost) {
        setIdentityModalMode(null);
        return;
      }
      const enriched: CreateCommentRequest = {
        ...pendingPost,
        displayName: values.displayName,
        email: values.email,
      };
      await performPost(enriched);
      identity.refresh();
      setIdentityModalMode(null);
      setPendingPost(null);
    },
    [identity, pendingPost, performPost]
  );

  return {
    query,
    tree,
    identity,
    isPosting: postComment.isPending,
    composerError,
    composer,
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
  };
}

export { targetKeyOf };
