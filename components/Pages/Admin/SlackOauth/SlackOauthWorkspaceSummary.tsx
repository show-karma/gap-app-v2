"use client";

import { Loader2, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import {
  useDeleteSlackWorkspace,
  useTestSlackWorkspace,
} from "@/hooks/useSlackOauth";
import type { SlackOAuthWorkspace } from "@/types/slack-oauth";

/**
 * Read-only summary + action buttons for an active/revoked workspace.
 * Renders a definition list of team, status, install date, and
 * consecutive-failure count (only when > 0 to keep the card calm).
 *
 * Test/Disconnect are the only write actions here; user-link management
 * lives in the sibling `SlackOauthUserLinksSection`.
 */

/**
 * Format with explicit locale + parts. `toLocaleDateString()` without
 * a locale arg uses the runtime's default — which differs between
 * Node (SSR) and the browser, producing hydration-mismatch warnings.
 * Fixed to en-US to match the codebase's date convention; per-user
 * localization is a separate feature.
 */
function formatInstalledAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusColorClass(status: SlackOAuthWorkspace["status"]): string {
  if (status === "ACTIVE") return "text-emerald-700 dark:text-emerald-400";
  return "text-red-600 dark:text-red-400";
}

export function SlackOauthWorkspaceSummary({
  workspace,
  communitySlug,
}: {
  workspace: SlackOAuthWorkspace;
  communitySlug: string;
}) {
  const { mutate: testConnection, isPending: isTesting } = useTestSlackWorkspace(
    communitySlug
  );
  const { mutate: deleteWorkspace } = useDeleteSlackWorkspace(communitySlug);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleTest = () => {
    testConnection(workspace.uid, {
      onSuccess: (r) => toast.success(`Connected as ${r.botUserId}`),
      onError: (e) => toast.error(e.message || "Test failed"),
    });
  };

  const handleConfirmDelete = async () => {
    await new Promise<void>((resolve, reject) => {
      deleteWorkspace(workspace.uid, {
        onSuccess: () => {
          toast.success("Workspace disconnected");
          resolve();
        },
        onError: (e) => {
          toast.error(e.message || "Disconnect failed");
          reject(e);
        },
      });
    });
    setDeleteOpen(false);
  };

  return (
    <>
      <dl className="grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-stone-500 dark:text-zinc-400">Team</dt>
        <dd className="text-stone-900 dark:text-zinc-100">
          {workspace.teamName}{" "}
          <span className="text-stone-400">({workspace.teamId})</span>
        </dd>

        <dt className="text-stone-500 dark:text-zinc-400">Status</dt>
        <dd className={`font-medium ${statusColorClass(workspace.status)}`}>
          {workspace.status}
          {workspace.statusReason ? ` — ${workspace.statusReason}` : ""}
        </dd>

        <dt className="text-stone-500 dark:text-zinc-400">Installed</dt>
        <dd className="text-stone-700 dark:text-zinc-300">
          {formatInstalledAt(workspace.installedAt)}
        </dd>

        {workspace.consecutiveFailures > 0 ? (
          <>
            <dt className="text-stone-500 dark:text-zinc-400">
              Recent failures
            </dt>
            <dd className="text-amber-600 dark:text-amber-400">
              {workspace.consecutiveFailures} consecutive
            </dd>
          </>
        ) : null}
      </dl>

      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleTest}
          disabled={isTesting}
          aria-label="Test Slack connection"
        >
          {isTesting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-3.5 w-3.5" />
          )}
          Test connection
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setDeleteOpen(true)}
          aria-label="Disconnect Slack workspace"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Disconnect
        </Button>

        {deleteOpen ? (
          <DeleteDialog
            title={`Disconnect workspace "${workspace.teamName}"? This removes all Slack user links.`}
            deleteFunction={handleConfirmDelete}
            isLoading={false}
            buttonElement={null}
            externalIsOpen={deleteOpen}
            externalSetIsOpen={setDeleteOpen}
          />
        ) : null}
      </div>
    </>
  );
}
