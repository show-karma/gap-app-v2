"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  CheckCircle2,
  Circle,
  CircleDotDashed,
  GripVertical,
  type LucideIcon,
  OctagonAlert,
  Plus,
  X,
} from "lucide-react";
import pluralize from "pluralize";
import { memo, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useCreateWorkTask, useUpdateWorkTaskStatus, useWorkTasks } from "@/hooks/useWorkBoard";
import {
  hermesClient,
  TEAM_ROLE_LABELS,
  type TeamRole,
  VISIBLE_TEAM_ROLES,
  type WorkTask,
  type WorkTaskStatus,
} from "@/lib/hermes-client";
import { TeamErrorState } from "@/src/features/nonprofit/TeamErrorState";
import { UploadButton } from "@/src/features/uploads/UploadButton";
import { WorkTaskDrawer } from "./WorkTaskDrawer";

interface ColumnSpec {
  status: WorkTaskStatus;
  label: string;
  dot: string;
  icon: LucideIcon;
}

const COLUMNS: ColumnSpec[] = [
  { status: "queued", label: "Queued", dot: "bg-gray-400", icon: Circle },
  { status: "working", label: "Working", dot: "bg-sky-500", icon: CircleDotDashed },
  { status: "blocked", label: "Blocked", dot: "bg-amber-500", icon: OctagonAlert },
  { status: "done", label: "Done", dot: "bg-emerald-500", icon: CheckCircle2 },
];

const USER_DROPPABLE_STATUSES: WorkTaskStatus[] = ["queued", "working", "blocked", "done"];

const ROLE_TINT: Record<TeamRole, string> = {
  orchestrator: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  fundraiser: "bg-amber-50 text-amber-800 ring-amber-100",
  communications: "bg-sky-50 text-sky-700 ring-sky-100",
  operations: "bg-violet-50 text-violet-700 ring-violet-100",
};

interface Props {
  slug: string;
}

export function WorkBoard({ slug }: Props) {
  const { data: tasks, isLoading, isError, refetch } = useWorkTasks(slug);
  const create = useCreateWorkTask(slug);
  const update = useUpdateWorkTaskStatus(slug);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Require a small drag distance before drag starts so card clicks
  // (which open the drawer) still work normally.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {COLUMNS.map((c) => (
          <div
            key={c.status}
            className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return <TeamErrorState onRetry={() => refetch()} />;
  }

  const total = (tasks ?? []).length;

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          {total === 0
            ? "No tasks yet. Add the first one to kick off your team."
            : `${total} ${pluralize("task", total)} across the board.`}
        </p>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New task
        </button>
      </div>

      {showNew ? (
        <NewTaskForm
          onSubmit={(input, files) =>
            create.mutate(input, {
              onSuccess: async (task) => {
                if (files.length > 0) {
                  // Upload files to the freshly-minted task id. Sequential
                  // keeps audit log ordering deterministic and avoids
                  // hammering the per-task file-count cap with one bulk
                  // burst. Failures don't roll back the task — it's still
                  // useful without the attachments — but each is surfaced
                  // via the upload helper's toast so the user can retry.
                  for (const f of files) {
                    try {
                      await hermesClient.uploadTaskAttachment(slug, task.id, f);
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? `Couldn't attach ${f.name}: ${err.message}`
                          : `Couldn't attach ${f.name}`
                      );
                    }
                  }
                }
                setShowNew(false);
              },
            })
          }
          onCancel={() => setShowNew(false)}
          pending={create.isPending}
        />
      ) : null}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              spec={col}
              tasks={byStatus[col.status]}
              onOpen={(id) => setOpenTaskId(id)}
              onMove={(taskId, status) => update.mutate({ taskId, status })}
            />
          ))}
        </div>
      </DndContext>

      {openTaskId ? (
        <WorkTaskDrawer slug={slug} taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      ) : null}
    </>
  );
}

const Column = memo(function Column({
  spec,
  tasks,
  onOpen,
  onMove,
}: {
  spec: ColumnSpec;
  tasks: WorkTask[];
  onOpen: (id: string) => void;
  onMove: (taskId: string, status: WorkTaskStatus) => void;
}) {
  const droppable = USER_DROPPABLE_STATUSES.includes(spec.status);
  const { setNodeRef, isOver } = useDroppable({
    id: spec.status,
    disabled: !droppable,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 transition-colors ${
        isOver && droppable ? "border-gray-900 bg-gray-100" : "border-gray-200 bg-gray-50/60"
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${spec.dot}`} aria-hidden />
          <h3 className="text-sm font-semibold text-gray-900">{spec.label}</h3>
        </div>
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-gray-500 ring-1 ring-gray-200">
          {tasks.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {tasks.length === 0 ? (
          <li
            className={`rounded-lg border border-dashed px-3 py-8 text-center text-xs ${
              isOver && droppable
                ? "border-gray-900 bg-white text-gray-700"
                : "border-gray-200 text-gray-400"
            }`}
          >
            <spec.icon className="mx-auto mb-1.5 h-4 w-4 text-gray-300" aria-hidden />
            {droppable ? "Drag tasks here" : "Nothing here"}
          </li>
        ) : null}
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            currentStatus={spec.status}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
      </ul>
    </div>
  );
});

const TaskCard = memo(function TaskCard({
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;
  const assigneeLabel = task.assignee
    ? (TEAM_ROLE_LABELS[task.assignee as TeamRole] ?? task.assignee)
    : null;
  const assigneeTint =
    task.assignee && (task.assignee as TeamRole) in ROLE_TINT
      ? ROLE_TINT[task.assignee as TeamRole]
      : "bg-gray-50 text-gray-700 ring-gray-200";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <button
        {...listeners}
        {...attributes}
        type="button"
        aria-label="Drag handle"
        className="absolute -left-0.5 top-3 z-10 hidden cursor-grab text-gray-300 active:cursor-grabbing group-hover:block"
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="block w-full rounded-t-lg p-3 text-left"
      >
        <div className="pl-1 text-sm font-medium leading-snug text-gray-900">{task.title}</div>
        {assigneeLabel ? (
          <div className="mt-2 pl-1">
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${assigneeTint}`}
            >
              {assigneeLabel}
            </span>
          </div>
        ) : null}
      </button>
      <StatusMover current={currentStatus} onMove={(next) => onMove(task.id, next)} />
    </li>
  );
});

function StatusMover({
  current,
  onMove,
}: {
  current: WorkTaskStatus;
  onMove: (next: WorkTaskStatus) => void;
}) {
  const targets = COLUMNS.filter((c) => c.status !== current);

  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 px-3 py-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
        Move to
      </span>
      {targets.map((t) => (
        <button
          key={t.status}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMove(t.status);
          }}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <span className={`h-1 w-1 rounded-full ${t.dot}`} aria-hidden />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function NewTaskForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (
    input: { title: string; description?: string; assignee?: string },
    files: File[]
  ) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  // Files are held locally until submit because the task id doesn't exist
  // yet — uploads happen in the parent's onSuccess once the task is created.
  const [files, setFiles] = useState<File[]>([]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit(
          {
            title: title.trim(),
            description: description.trim() || undefined,
            assignee: assignee || undefined,
          },
          files
        );
      }}
      className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <input
        // biome-ignore lint/a11y/noAutofocus: the form is user-triggered and focusing is expected
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title — what needs doing?"
        className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100"
        required
        maxLength={500}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional description"
        rows={3}
        className="mt-3 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100"
        maxLength={8000}
      />
      {files.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {files.map((f, idx) => (
            <li
              key={`${f.name}-${f.lastModified}-${idx}`}
              className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px]"
            >
              <span className="max-w-[160px] truncate font-medium text-gray-800">{f.name}</span>
              <button
                type="button"
                onClick={() => setFiles((cur) => cur.filter((_, i) => i !== idx))}
                className="rounded p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="text-xs text-gray-600">
          Assign to{" "}
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="ml-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm shadow-sm"
          >
            <option value="">Unassigned</option>
            {VISIBLE_TEAM_ROLES.map((role) => (
              <option key={role} value={role}>
                {TEAM_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <UploadButton onSelect={(f) => setFiles((cur) => [...cur, f])} />
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {pending
              ? files.length > 0
                ? "Adding & attaching…"
                : "Adding…"
              : files.length > 0
                ? `Add task with ${files.length} ${pluralize("file", files.length)}`
                : "Add task"}
          </button>
        </div>
      </div>
    </form>
  );
}
