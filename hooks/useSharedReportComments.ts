import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  assembleCommentTree,
  listSharedReportComments,
  postSharedReportComment,
} from "@/services/donor-research-comments.service";
import type {
  CreateCommentRequest,
  SharedReportComment,
  SharedReportCommentNode,
  SharedReportCommentsResponse,
} from "@/types/donor-research-comments";

const POLL_INTERVAL_MS = 30_000;

export const sharedReportCommentsKey = (token: string) =>
  ["shared-report-comments", token] as const;

interface UseSharedReportCommentsOptions {
  enabled?: boolean;
}

interface SharedReportCommentsHookResult {
  query: UseQueryResult<SharedReportCommentsResponse, Error>;
  tree: SharedReportCommentNode[];
  postComment: UseMutationResult<
    SharedReportComment,
    Error,
    { request: CreateCommentRequest; idempotencyKey: string }
  >;
  /** Re-post a comment whose optimistic POST failed (removes the failed row, re-submits). */
  retryFailed: (commentId: string) => void;
}

/**
 * React Query hook for the donor-shared report comments surface.
 *
 *   - Polls every 30s, pauses on hidden tabs
 *     (`refetchIntervalInBackground: false`)
 *   - Disables polling when `enabled=false` (e.g., report 404 — token
 *     revoked / expired)
 *   - `postComment` is a mutation with optimistic root + reply append.
 *     The component generates `idempotencyKey` per attempt (UUID v4).
 */
export function useSharedReportComments(
  token: string,
  opts: UseSharedReportCommentsOptions = {}
): SharedReportCommentsHookResult {
  const queryClient = useQueryClient();
  const enabled = opts.enabled !== false;

  const query = useQuery<SharedReportCommentsResponse, Error>({
    queryKey: sharedReportCommentsKey(token),
    queryFn: ({ signal }) => listSharedReportComments(token, { limit: 50 }, signal),
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: enabled,
    retry: false,
    enabled,
  });

  const tree = useMemo(() => {
    if (!query.data) return [] as SharedReportCommentNode[];
    return assembleCommentTree(query.data.roots, query.data.replies);
  }, [query.data]);

  const postComment = useMutation<
    SharedReportComment,
    Error,
    { request: CreateCommentRequest; idempotencyKey: string }
  >({
    mutationFn: ({ request, idempotencyKey }) =>
      postSharedReportComment(token, request, idempotencyKey),
    onMutate: async ({ request, idempotencyKey }) => {
      await queryClient.cancelQueries({ queryKey: sharedReportCommentsKey(token) });
      const snapshot = queryClient.getQueryData<SharedReportCommentsResponse>(
        sharedReportCommentsKey(token)
      );
      const optimisticId = `optimistic-${idempotencyKey}`;
      // `_optimistic` drives the row's "Sending…" pending indicator. The flag
      // is spread into the tree node by `assembleCommentTree`, so the row
      // renders a clear in-flight state until the POST settles.
      const optimistic: SharedReportComment & { _optimistic?: boolean; _failed?: boolean } = {
        id: optimisticId,
        parentCommentId: request.parentCommentId ?? null,
        isAdvisor: false,
        displayName: request.displayName,
        anchor: request.anchor ?? null,
        body: request.body,
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };
      queryClient.setQueryData<SharedReportCommentsResponse>(
        sharedReportCommentsKey(token),
        (current) => {
          const base: SharedReportCommentsResponse = current ?? {
            roots: [],
            replies: [],
            pageInfo: { nextCursor: null },
          };
          if (optimistic.parentCommentId === null) {
            return { ...base, roots: [optimistic, ...base.roots] };
          }
          return { ...base, replies: [...base.replies, optimistic] };
        }
      );
      return { snapshot, optimisticId };
    },
    onError: (_err, _vars, ctx) => {
      // Keep the optimistic row visible in a FAILED state instead of rolling
      // back (which looked like the comment was added then deleted) so the
      // donor can retry. We do NOT invalidate on error (that refetch would
      // immediately wipe this row) — invalidation happens in onSuccess only.
      const optimisticId = (ctx as { optimisticId?: string } | undefined)?.optimisticId;
      if (!optimisticId) return;
      const markFailed = <T extends SharedReportComment>(comment: T): T =>
        comment.id === optimisticId ? { ...comment, _optimistic: false, _failed: true } : comment;
      queryClient.setQueryData<SharedReportCommentsResponse>(
        sharedReportCommentsKey(token),
        (current) => {
          if (!current) return current;
          return {
            ...current,
            roots: current.roots.map(markFailed),
            replies: current.replies.map(markFailed),
          };
        }
      );
    },
    onSuccess: () => {
      // Reconcile with the server only on success — the optimistic row is
      // replaced by the real one. (Failed rows are preserved by skipping
      // invalidation on error.)
      void queryClient.invalidateQueries({ queryKey: sharedReportCommentsKey(token) });
    },
  });

  // Re-post a failed comment: drop the failed row from the cache, then submit
  // again with a fresh idempotency key.
  const retryFailed = useCallback(
    (commentId: string) => {
      const current = queryClient.getQueryData<SharedReportCommentsResponse>(
        sharedReportCommentsKey(token)
      );
      const failed = current
        ? [...current.roots, ...current.replies].find((c) => c.id === commentId)
        : undefined;
      if (!failed) return;
      queryClient.setQueryData<SharedReportCommentsResponse>(sharedReportCommentsKey(token), (c) =>
        c
          ? {
              ...c,
              roots: c.roots.filter((x) => x.id !== commentId),
              replies: c.replies.filter((x) => x.id !== commentId),
            }
          : c
      );
      const request: CreateCommentRequest = {
        body: failed.body,
        displayName: failed.displayName,
        ...(failed.anchor ? { anchor: failed.anchor } : {}),
        ...(failed.parentCommentId ? { parentCommentId: failed.parentCommentId } : {}),
      };
      postComment.mutate({ request, idempotencyKey: uuidv4() });
    },
    [queryClient, token, postComment]
  );

  return { query, tree, postComment, retryFailed };
}
