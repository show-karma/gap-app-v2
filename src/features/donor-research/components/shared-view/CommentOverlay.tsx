"use client";

import { useCallback, useMemo, useState } from "react";
import pluralize from "pluralize";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CommentAnchor } from "@/src/features/donor-research/components/anchor/types";
import { useCommenterIdentity } from "@/hooks/useCommenterIdentity";
import { useSharedReportComments } from "@/hooks/useSharedReportComments";
import {
  IdempotencyCollisionError,
  IdentityRequiredError,
  RateLimitedError,
  type CreateCommentRequest,
  type SharedReportCommentNode,
} from "@/types/donor-research-comments";

import { CommentComposer } from "./CommentComposer";
import { CommentRow } from "./CommentRow";
import { IdentityBadge } from "./IdentityBadge";
import { IdentityCaptureDialog } from "./IdentityCaptureDialog";

interface CommentOverlayProps {
  token: string;
  /** True when token has been revoked / expired — hides the overlay entirely. */
  reportRevoked?: boolean;
  /** True when the viewer's Privy session matches the report's advisor. */
  isAdvisor?: boolean;
}

function totalCount(tree: SharedReportCommentNode[]): number {
  let n = 0;
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.pop()!;
    n += 1;
    stack.push(...node.children);
  }
  return n;
}

function findNodeById(
  tree: SharedReportCommentNode[],
  id: string,
): SharedReportCommentNode | null {
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.id === id) return node;
    stack.push(...node.children);
  }
  return null;
}

/**
 * Comment sidebar: lists all root comments + their reply threads in
 * one Sheet on desktop / full-screen drawer on mobile. Drives the
 * composer (root + reply) and orchestrates the IdentityCaptureDialog
 * round-trip when the donor lacks a cookie.
 *
 * Q2 "Not me — switch" affordance lives in the IdentityBadge — clears
 * the cookies via the proxy clear-identity route and re-prompts on the
 * next post.
 *
 * aria-live="polite" region (per DL-007) announces new comments and
 * replies so screen readers don't miss arrivals after the initial
 * render.
 */
export function CommentOverlay({
  token,
  reportRevoked = false,
  isAdvisor = false,
}: CommentOverlayProps) {
  const { query, tree, postComment } = useSharedReportComments(token, {
    enabled: !reportRevoked,
  });
  const identity = useCommenterIdentity(token, isAdvisor);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [composerOpenFor, setComposerOpenFor] = useState<string | "root" | null>(
    null,
  );
  const [rootAnchor, setRootAnchor] = useState<CommentAnchor | null>({
    kind: "section",
    sectionKey: "methodology",
  });
  const [identityModalMode, setIdentityModalMode] = useState<
    "post" | "edit-name" | null
  >(null);
  const [pendingPost, setPendingPost] = useState<CreateCommentRequest | null>(
    null,
  );
  const [composerError, setComposerError] = useState<string | null>(null);

  const total = totalCount(tree);

  const handleReplyClick = useCallback((parentId: string) => {
    setComposerError(null);
    setComposerOpenFor(parentId);
  }, []);

  const handleRootClick = useCallback(() => {
    setComposerError(null);
    setRootAnchor({ kind: "section", sectionKey: "methodology" });
    setComposerOpenFor("root");
  }, []);

  const submitComment = useCallback(
    async (request: CreateCommentRequest) => {
      setComposerError(null);
      try {
        await postComment.mutateAsync({ request, idempotencyKey: uuidv4() });
        setComposerOpenFor(null);
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
          setComposerError("That key was already used — try again.");
          return;
        }
        setComposerError("Something went wrong. Try again.");
      }
    },
    [postComment],
  );

  const handleComposerSubmit = useCallback(
    async (body: string) => {
      if (composerOpenFor === null) return;
      const parentId = composerOpenFor === "root" ? undefined : composerOpenFor;
      const request: CreateCommentRequest = {
        body,
        displayName: identity.displayName ?? "",
        ...(parentId ? { parentCommentId: parentId } : {}),
        ...(parentId ? {} : rootAnchor ? { anchor: rootAnchor } : {}),
      };
      await submitComment(request);
    },
    [composerOpenFor, identity.displayName, rootAnchor, submitComment],
  );

  const handleIdentitySubmit = useCallback(
    async (values: { displayName: string; email: string }) => {
      if (identityModalMode === "edit-name") {
        // Edit-name-only mode: the parent cookie carries email; the FE
        // re-fires the same comment but with the updated name. v1
        // simply closes — the donor's next comment uses the new name.
        identity.refresh();
        setIdentityModalMode(null);
        return;
      }
      if (!pendingPost) {
        setIdentityModalMode(null);
        return;
      }
      const enriched: CreateCommentRequest = {
        ...pendingPost,
        displayName: values.displayName,
        email: values.email,
      };
      await submitComment(enriched);
      identity.refresh();
      setIdentityModalMode(null);
      setPendingPost(null);
    },
    [identity, identityModalMode, pendingPost, submitComment],
  );

  const announceText = useMemo(() => {
    const last = tree[0];
    if (!last) return "";
    return `${last.displayName} ${last.parentCommentId ? "replied" : "commented"}`;
  }, [tree]);

  if (reportRevoked) return null;

  const activeReply =
    composerOpenFor && composerOpenFor !== "root"
      ? findNodeById(tree, composerOpenFor)
      : null;

  return (
    <>
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

            <div className="flex-1 overflow-y-auto pr-2">
              {query.isLoading && (
                <div className="space-y-3">
                  <div className="h-16 animate-pulse rounded bg-muted" />
                  <div className="h-12 animate-pulse rounded bg-muted" />
                </div>
              )}
              {query.error && !query.isLoading && (
                <p className="text-sm text-destructive">
                  Couldn’t load comments — retry coming up on next poll.
                </p>
              )}
              {!query.isLoading && !query.error && tree.length === 0 && (
                <p className="text-sm text-muted-foreground">Be the first to comment.</p>
              )}
              {tree.length > 0 && (
                <div className="space-y-3">
                  {tree.map((node) => (
                    <CommentRow
                      key={node.id}
                      node={node}
                      depth={0}
                      onReply={handleReplyClick}
                    />
                  ))}
                </div>
              )}
            </div>

            {composerOpenFor !== null ? (
              <CommentComposer
                parentDisplayName={activeReply?.displayName ?? undefined}
                anchor={composerOpenFor === "root" ? rootAnchor : undefined}
                externalError={composerError}
                isSubmitting={postComment.isPending}
                onCancel={() => setComposerOpenFor(null)}
                onSubmit={handleComposerSubmit}
              />
            ) : (
              <Button variant="outline" onClick={handleRootClick}>
                Add a comment
              </Button>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div aria-live="polite" className="sr-only">
        {announceText}
      </div>

      <IdentityCaptureDialog
        open={identityModalMode !== null}
        nameOnly={identityModalMode === "edit-name"}
        isSubmitting={postComment.isPending}
        onOpenChange={(open) => {
          if (!open) setIdentityModalMode(null);
        }}
        onSubmit={handleIdentitySubmit}
      />
    </>
  );
}
