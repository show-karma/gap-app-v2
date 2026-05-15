"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import {
  useCreateWorkTask,
  useUpdateWorkTaskStatus,
  useWorkTasks,
} from "@/hooks/useWorkBoard";
import {
  TEAM_ROLE_LABELS,
  type TeamRole,
  VISIBLE_TEAM_ROLES,
  type WorkTask,
  type WorkTaskStatus,
} from "@/lib/hermes-client";
import { WorkTaskDrawer } from "./WorkTaskDrawer";

const COLUMNS: Array<{ status: WorkTaskStatus; label: string }> = [
  { status: "queued", label: "Queued" },
  { status: "working", label: "Working" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
];

const USER_DROPPABLE_STATUSES: WorkTaskStatus[] = [
  "queued",
  "working",
  "blocked",
  "done",
];

interface Props {
  slug: string;
}

export function WorkBoard({ slug }: Props) {
  const { data: tasks, isLoading, isError, error, refetch } = useWorkTasks(slug);
  const create = useCreateWorkTask(slug);
  const update = useUpdateWorkTaskStatus(slug);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Require a small drag distance before drag starts so card clicks
  // (which open the drawer) still work normally.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const targetStatus = event.over?.id as WorkTaskStatus | undefined;
    const taskId = event.active.id as string;
    if (!targetStatus) return;
    if (!USER_DROPPABLE_STATUSES.includes(targetStatus)) return;
    const current = (tasks ?? []).find((t) => t.id === taskId);
    if (!current || current.status === targetStatus) return;
    update.mutate({ taskId, status: targetStatus });
  };

  const byStatus = useMemo(() => {
    const groups: Record<WorkTaskStatus, WorkTask[]> = {
      queued: [],
      working: [],
      blocked: [],
      done: [],
    };
    for (const t of tasks ?? []) {
      const bucket = groups[t.status as WorkTaskStatus] ?? groups.queued;
      bucket.push(t);
    }
    return groups;
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {COLUMNS.map((c) => (
          <div key={c.status} className="h-64 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-8 rounded border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load tasks"}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded border px-3 py-1 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const empty = (tasks ?? []).length === 0;

  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {empty ? "No tasks yet — add the first one to kick off your team." : null}
        </p>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          + New task
        </button>
      </div>

      {showNew ? (
        <NewTaskForm
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: () => setShowNew(false),
            })
          }
          onCancel={() => setShowNew(false)}
          pending={create.isPending}
        />
      ) : null}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              label={col.label}
              status={col.status}
              tasks={byStatus[col.status]}
              onOpen={(id) => setOpenTaskId(id)}
              onMove={(taskId, status) =>
                update.mutate({ taskId, status })
              }
            />
          ))}
        </div>
      </DndContext>

      {openTaskId ? (
        <WorkTaskDrawer
          slug={slug}
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
        />
      ) : null}
    </>
  );
}

function Column({
  label,
  status,
  tasks,
  onOpen,
  onMove,
}: {
  label: string;
  status: WorkTaskStatus;
  tasks: WorkTask[];
  onOpen: (id: string) => void;
  onMove: (taskId: string, status: WorkTaskStatus) => void;
}) {
  const droppable = USER_DROPPABLE_STATUSES.includes(status);
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: !droppable,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-3 transition-colors ${
        isOver && droppable
          ? "border-black bg-gray-100"
          : droppable
            ? "border-gray-200 bg-gray-50"
            : "border-dashed border-gray-200 bg-gray-50/60"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-gray-500">{tasks.length}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {tasks.length === 0 ? (
          <li className="rounded border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400">
            {droppable ? "Drop here" : "Nothing here"}
          </li>
        ) : null}
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            currentStatus={status}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
      </ul>
    </div>
  );
}

function TaskCard({
  task,
  currentStatus,
  onOpen,
  onMove,
}: {
  task: WorkTask;
  currentStatus: WorkTaskStatus;
  onOpen: (id: string) => void;
  onMove: (taskId: string, status: WorkTaskStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : ""}
    >
      <div
        {...listeners}
        {...attributes}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(task.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(task.id);
          }
        }}
        className="block w-full cursor-grab rounded border bg-white p-3 text-left shadow-sm transition hover:shadow active:cursor-grabbing"
      >
        <div className="text-sm font-medium">{task.title}</div>
        {task.assignee ? (
          <div className="mt-1 text-xs text-gray-500">
            {TEAM_ROLE_LABELS[task.assignee as TeamRole] ?? task.assignee}
          </div>
        ) : null}
        <StatusMover
          current={currentStatus}
          onMove={(next) => onMove(task.id, next)}
        />
      </div>
    </li>
  );
}

function StatusMover({
  current,
  onMove,
}: {
  current: WorkTaskStatus;
  onMove: (next: WorkTaskStatus) => void;
}) {
  const targets = USER_DROPPABLE_STATUSES.filter((s) => s !== current);

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {targets.map((t) => (
        <span
          key={t}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onMove(t);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onMove(t);
            }
          }}
          className="cursor-pointer rounded border bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-100"
        >
          → {t}
        </span>
      ))}
    </div>
  );
}

function NewTaskForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (input: {
    title: string;
    description?: string;
    assignee?: string;
  }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          title: title.trim(),
          description: description.trim() || undefined,
          assignee: assignee || undefined,
        });
      }}
      className="mt-4 rounded border bg-white p-4"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full rounded border px-3 py-2 text-sm"
        required
        maxLength={500}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional description"
        rows={3}
        className="mt-3 w-full rounded border px-3 py-2 text-sm"
        maxLength={8000}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="text-xs text-gray-600">
          Assign to{" "}
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="ml-2 rounded border px-2 py-1 text-sm"
          >
            <option value="">Unassigned</option>
            {VISIBLE_TEAM_ROLES.map((role) => (
              <option key={role} value={role}>
                {TEAM_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:bg-gray-300"
          >
            {pending ? "Adding…" : "Add task"}
          </button>
        </div>
      </div>
    </form>
  );
}
