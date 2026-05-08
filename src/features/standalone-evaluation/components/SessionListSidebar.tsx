"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import React from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { cn } from "@/utilities/tailwind";
import { useDeleteSession, useSessions } from "../hooks/useEvaluationSessions";
import type { SessionResponse } from "../schemas/session.schema";

interface SessionListSidebarProps {
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

interface SessionItemProps {
  session: SessionResponse;
  isActive: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: () => Promise<void>;
}

const SessionItem = React.memo(function SessionItem({
  session,
  isActive,
  isDeleting,
  onSelect,
  onDelete,
}: SessionItemProps) {
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "block w-full rounded-md border px-3 py-2 text-left transition-colors",
          isActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
            : "border-border bg-background hover:border-muted-foreground/40"
        )}
      >
        <p className="line-clamp-1 text-sm font-medium text-foreground">
          {session.programDescription.slice(0, 60) || "Untitled"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {session.evaluationStyle} · {session.status.replace("_", " ").toLowerCase()}
        </p>
      </button>
      <div className="absolute right-1.5 top-1.5">
        <DeleteDialog
          title={`Delete this session?`}
          deleteFunction={onDelete}
          isLoading={isDeleting}
          buttonElement={{
            icon: <Trash2 className="h-3.5 w-3.5 text-red-500" />,
            text: "",
            styleClass: "border-none p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md",
          }}
        />
      </div>
    </li>
  );
});

export function SessionListSidebar({
  activeSessionId,
  onSelect,
  onCreateNew,
}: SessionListSidebarProps) {
  const sessions = useSessions();
  const deleteSession = useDeleteSession();

  return (
    <aside className="flex w-full flex-col gap-3 lg:max-w-xs">
      <button
        type="button"
        onClick={onCreateNew}
        className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
      >
        <Plus className="h-4 w-4" /> New session
      </button>

      {sessions.isLoading ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading sessions…
        </div>
      ) : sessions.isError ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>Couldn’t load sessions: {sessions.error.message}</span>
          <button
            type="button"
            className="font-medium underline"
            onClick={() => sessions.refetch()}
          >
            Retry
          </button>
        </div>
      ) : (sessions.data?.items.length ?? 0) === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          No sessions yet. Create one to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {(sessions.data?.items ?? []).map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              isDeleting={deleteSession.isPending && deleteSession.variables === session.id}
              onSelect={() => onSelect(session.id)}
              onDelete={() => deleteSession.mutateAsync(session.id)}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}
