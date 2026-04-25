"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { useUnlinkSlackUser } from "@/hooks/useSlackOauth";
import type { SlackOAuthUserLink } from "@/types/slack-oauth";

/**
 * Single row in the linked-users list. Isolated from the table so:
 *  - The per-row delete-dialog open state stays local (rather than
 *    hoisting into the parent with an index → Map<uid, boolean>)
 *  - The unlink `useMutation` is scoped to one link at a time; React
 *    Query's `isPending` reads per row without fan-out
 */
export function SlackOauthUserLinkRow({
  link,
  communitySlug,
}: {
  link: SlackOAuthUserLink;
  communitySlug: string;
}) {
  const { mutate: unlink, isPending } = useUnlinkSlackUser(communitySlug);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmDelete = async () => {
    await new Promise<void>((resolve, reject) => {
      unlink(link.uid, {
        onSuccess: () => {
          toast.success("User unlinked");
          resolve();
        },
        onError: (e) => {
          toast.error(e.message || "Unlink failed");
          reject(e);
        },
      });
    });
    setConfirmOpen(false);
  };

  return (
    <li className="flex items-center justify-between px-4 py-2 text-xs">
      <div>
        <p className="font-medium text-stone-900 dark:text-zinc-100">{link.karmaUserId}</p>
        <p className="text-stone-500 dark:text-zinc-400">
          → {link.slackUserId}
          {link.slackHandleSnapshot ? ` (${link.slackHandleSnapshot})` : ""}
          <span className="ml-1 text-stone-400">· {link.linkSource}</span>
        </p>
        {link.lastDeliveryError ? (
          <p className="mt-0.5 text-amber-600 dark:text-amber-400">
            Last delivery error: {link.lastDeliveryError}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        aria-label={`Unlink ${link.karmaUserId}`}
        className="rounded-md p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {confirmOpen ? (
        <DeleteDialog
          title={`Unlink ${link.karmaUserId} from Slack?`}
          deleteFunction={handleConfirmDelete}
          isLoading={false}
          buttonElement={null}
          externalIsOpen={confirmOpen}
          externalSetIsOpen={setConfirmOpen}
        />
      ) : null}
    </li>
  );
}
