"use client";

import { useState } from "react";
import { useAddWorkComment, useWorkTask } from "@/hooks/useWorkBoard";

interface Props {
  slug: string;
  taskId: string;
  onClose: () => void;
}

export function WorkTaskDrawer({ slug, taskId, onClose }: Props) {
  const { data, isLoading, isError, error } = useWorkTask(slug, taskId);
  const addComment = useAddWorkComment(slug, taskId);
  const [body, setBody] = useState("");

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l bg-white p-6 shadow-2xl"
      role="dialog"
      aria-label="Task details"
    >
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {isLoading ? "Loading…" : data?.title ?? "Task"}
          </h2>
          {data ? (
            <div className="mt-1 text-xs text-gray-500">
              {data.status} · {data.assignee ?? "Unassigned"}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          ×
        </button>
      </header>

      {isError ? (
        <p className="mt-6 text-sm text-red-600">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      ) : null}

      {data?.description ? (
        <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">
          {data.description}
        </p>
      ) : null}

      <section className="mt-8">
        <h3 className="text-sm font-semibold">Comments</h3>
        {data && (data.comments ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            No comments yet. Add the first one below.
          </p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {(data?.comments ?? []).map((c) => (
            <li key={c.id} className="rounded border bg-gray-50 p-3 text-sm">
              <div className="text-xs text-gray-500">{c.author ?? "anonymous"}</div>
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
            });
          }}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment"
            rows={3}
            maxLength={8000}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!body.trim() || addComment.isPending}
            className="mt-2 rounded bg-black px-3 py-1.5 text-sm text-white disabled:bg-gray-300"
          >
            {addComment.isPending ? "Posting…" : "Post comment"}
          </button>
        </form>
      </section>
    </aside>
  );
}
