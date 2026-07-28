"use client";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { permissionsKeys } from "@/src/core/rbac/hooks/use-permissions";

interface PermissionCheckErrorProps {
  /**
   * What the viewer was trying to reach, lowercase and article-free — e.g.
   * "this report", "this page". Rendered mid-sentence.
   */
  subject?: string;
}

/**
 * Terminal state for "we could not decide what you are allowed to do".
 *
 * Every RBAC-gated surface reads its verdict from a single permissions fetch,
 * and `useStaff()` / `usePermissionContext()` report `false` for BOTH "denied"
 * and "could not be decided". Rendering the denied UI for the second case tells
 * a real super-admin they lack a role they actually hold, with no hint that
 * anything failed and no way to retry — the failure looks like a policy
 * decision. So any caller that gates on RBAC must branch on `isError` BEFORE
 * `!isStaff` / `!can(...)` and render this instead.
 *
 * Retry refetches the permissions query rather than reloading the page, so a
 * transient backend blip costs one request, not a full app boot.
 */
export function PermissionCheckError({ subject = "this page" }: PermissionCheckErrorProps) {
  const queryClient = useQueryClient();
  const isRetrying = useIsFetching({ queryKey: permissionsKeys.all }) > 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-12" role="alert">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle aria-hidden="true" className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          We couldn&apos;t verify your access
        </h1>
        <p className="text-sm text-muted-foreground">
          The permissions check didn&apos;t complete, so we can&apos;t show {subject} safely. This
          is usually temporary — please try again.
        </p>
        {/*
          Deliberately not the Button's own `isLoading` prop: it swaps the whole
          control for a bare spinner, which drops the label and the accessible
          name mid-retry. The in-place spinning icon keeps both.
        */}
        <Button
          aria-busy={isRetrying}
          disabled={isRetrying}
          onClick={() => {
            void queryClient.refetchQueries({ queryKey: permissionsKeys.all });
          }}
          type="button"
        >
          <RefreshCw aria-hidden="true" className={isRetrying ? "animate-spin" : undefined} />
          {isRetrying ? "Retrying…" : "Try again"}
        </Button>
      </div>
    </div>
  );
}
