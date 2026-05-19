"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Button } from "@/components/Utilities/Button";
import { type DropdownItem, MultiSelectDropdown } from "@/components/Utilities/MultiSelectDropdown";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteTaskAttachment,
  useTaskAttachments,
  useUploadTaskAttachment,
} from "@/hooks/useUploads";
import {
  useAddWorkComment,
  useArchiveWorkTask,
  useUpdateWorkTaskAssignee,
  useWorkTask,
} from "@/hooks/useWorkBoard";
import { aiAgentClient, TEAM_ROLE_LABELS, VISIBLE_TEAM_ROLES } from "@/lib/ai-agent-client";
import { humanizeApiError } from "@/lib/ai-agent-error";
import { AttachmentList } from "@/src/features/uploads/AttachmentList";
import { UploadButton } from "@/src/features/uploads/UploadButton";
import { ActivityPanel } from "./ActivityPanel";

const ASSIGNEE_DROPDOWN_ITEMS: DropdownItem[] = [
  { id: "", label: "Unassigned" },
  ...VISIBLE_TEAM_ROLES.map((role) => ({ id: role, label: TEAM_ROLE_LABELS[role] })),
];

interface Props {
  slug: string;
  taskId: string;
  onClose: () => void;
}

export function WorkTaskDrawer({ slug, taskId, onClose }: Props) {
  const { data, isLoading, isError, error } = useWorkTask(slug, taskId);
  const addComment = useAddWorkComment(slug, taskId);
  const archiveTask = useArchiveWorkTask(slug);
  const updateAssignee = useUpdateWorkTaskAssignee(slug, taskId);
  const attachments = useTaskAttachments(slug, taskId);
  const uploadAttachment = useUploadTaskAttachment(slug, taskId);
  const deleteAttachment = useDeleteTaskAttachment(slug, taskId);
  const [body, setBody] = useState("");

  const isRunning = data?.activity?.currentRun?.status === "running";

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl"
      role="dialog"
      aria-label="Task details"
    >
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {isLoading ? "Loading…" : (data?.title ?? "Task")}
          </h2>
          {data ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              Status: <span className="font-medium">{data.status}</span>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {data ? (
            <DeleteDialog
              title={
                <>
                  Delete this task?
                  <p className="mt-2 text-sm font-normal text-gray-600 dark:text-zinc-400">
                    {isRunning
                      ? "A worker is actively running this task. Wait for it to finish, then try again."
                      : "The task will be removed from the board. Its history (comments, runs) stays in the agent backend."}
                  </p>
                </>
              }
              isLoading={archiveTask.isPending}
              deleteFunction={async () => {
                if (isRunning) {
                  throw new Error("Cannot delete a running task");
                }
                await archiveTask.mutateAsync(taskId);
              }}
              afterFunction={onClose}
              buttonElement={{
                icon: <TrashIcon className="h-4 w-4" />,
                text: "",
                styleClass:
                  "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50",
              }}
            />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            ×
          </button>
        </div>
      </header>

      {isError ? (
        <p className="mt-6 text-sm text-red-600">{humanizeApiError(error, "Failed to load")}</p>
      ) : null}

      {data ? (
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-600 dark:text-zinc-300">
          <span className="text-gray-500 dark:text-zinc-400">Assignee</span>
          <MultiSelectDropdown
            items={ASSIGNEE_DROPDOWN_ITEMS}
            selectedIds={data.assignee ? [data.assignee] : [""]}
            onChange={(ids) => {
              const next = ids[ids.length - 1] ?? "";
              const normalized = next || null;
              if ((data.assignee ?? null) === normalized) return;
              updateAssignee.mutate(normalized);
            }}
            placeholder="Unassigned"
            className="w-56"
          />
        </div>
      ) : null}

      {data?.description ? (
        <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700 dark:text-zinc-300">
          {data.description}
        </p>
      ) : null}

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">Activity</h3>
        <ActivityPanel activity={data?.activity} />
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Attachments</h3>
          <UploadButton
            isUploading={uploadAttachment.isPending}
            onSelect={(file) => uploadAttachment.mutate(file)}
          />
        </div>
        <AttachmentList
          files={attachments.data ?? []}
          downloadUrl={(sha) => aiAgentClient.taskAttachmentDownloadUrl(slug, taskId, sha)}
          onDelete={(sha) => deleteAttachment.mutate(sha)}
          pendingDeleteSha={deleteAttachment.isPending ? deleteAttachment.variables : undefined}
          emptyLabel={attachments.isLoading ? "Loading…" : "No attachments yet"}
        />
      </section>

      <section className="mt-8">
        <h3 className="text-sm font-semibold">Comments</h3>
        {data && (data.comments ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400">
            No comments yet. Add the first one below.
          </p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {(data?.comments ?? []).map((c) => (
            <li
              key={c.id}
              className="rounded border dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 p-3 text-sm"
            >
              <div className="text-xs text-gray-500 dark:text-zinc-400">
                {c.author ?? "anonymous"}
              </div>
              <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            addComment.mutate(body.trim(), {
              onSuccess: () => setBody(""),
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : "Failed to post comment"),
            });
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment"
            rows={3}
            maxLength={8000}
          />
          <Button
            type="submit"
            variant="primary"
            isLoading={addComment.isPending}
            disabled={!body.trim() || addComment.isPending}
            className="mt-2"
          >
            Post comment
          </Button>
        </form>
      </section>
    </aside>
  );
}
