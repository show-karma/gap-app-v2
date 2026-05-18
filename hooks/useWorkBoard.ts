"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  hermesClient,
  type WorkActivity,
  type WorkTask,
  type WorkTaskComment,
  type WorkTaskStatus,
} from "@/lib/hermes-client";

const workKeys = {
  all: ["work"] as const,
  list: (slug: string) => [...workKeys.all, "list", slug] as const,
  task: (slug: string, id: string) => [...workKeys.all, "task", slug, id] as const,
};

export function useWorkTasks(slug: string | undefined) {
  return useQuery<WorkTask[]>({
    queryKey: slug ? workKeys.list(slug) : workKeys.all,
    enabled: !!slug,
    queryFn: () => {
      if (!slug) throw new Error("slug required");
      return hermesClient.listWorkTasks(slug);
    },
    refetchInterval: 15_000,
  });
}

export function useWorkTask(slug: string | undefined, taskId: string | undefined) {
  return useQuery<WorkTask & { comments: WorkTaskComment[]; activity?: WorkActivity }>({
    queryKey: slug && taskId ? workKeys.task(slug, taskId) : workKeys.all,
    enabled: !!(slug && taskId),
    queryFn: async () => {
      if (!slug || !taskId) throw new Error("slug and taskId required");
      const task = (await hermesClient.getWorkTask(slug, taskId)) as WorkTask & {
        comments: WorkTaskComment[];
        activity?: WorkActivity;
      };
      return task;
    },
    // Poll while the drawer is open so heartbeat updates land without a
    // manual refresh. 8s matches Hermes' heartbeat cadence loosely.
    refetchInterval: 8_000,
  });
}

export function useCreateWorkTask(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description?: string; assignee?: string }) =>
      hermesClient.createWorkTask(slug, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workKeys.list(slug) });
      toast.success("Task added");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add task"),
  });
}

export function useUpdateWorkTaskStatus(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; status: WorkTaskStatus }) =>
      hermesClient.updateWorkTaskStatus(slug, input.taskId, input.status),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: workKeys.list(slug) });
      const previous = qc.getQueryData<WorkTask[]>(workKeys.list(slug));
      if (previous) {
        qc.setQueryData<WorkTask[]>(
          workKeys.list(slug),
          previous.map((t) => (t.id === input.taskId ? { ...t, status: input.status } : t))
        );
      }
      return { previous };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(workKeys.list(slug), ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Could not move task");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: workKeys.list(slug) }),
  });
}

export function useArchiveWorkTask(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => hermesClient.archiveWorkTask(slug, taskId),
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: workKeys.list(slug) });
      const previous = qc.getQueryData<WorkTask[]>(workKeys.list(slug));
      if (previous) {
        qc.setQueryData<WorkTask[]>(
          workKeys.list(slug),
          previous.filter((t) => t.id !== taskId)
        );
      }
      return { previous };
    },
    onError: (err, _taskId, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(workKeys.list(slug), ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Could not delete task");
    },
    onSuccess: () => {
      toast.success("Task deleted");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: workKeys.list(slug) }),
  });
}

export function useAddWorkComment(slug: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => hermesClient.addWorkTaskComment(slug, taskId, body),
    onMutate: async (body: string) => {
      await qc.cancelQueries({ queryKey: workKeys.task(slug, taskId) });
      const previous = qc.getQueryData<WorkTask & { comments: WorkTaskComment[] }>(
        workKeys.task(slug, taskId)
      );
      const optimistic: WorkTaskComment = {
        id: `optimistic-${Date.now()}`,
        taskId,
        body,
        createdAt: new Date().toISOString(),
      };
      if (previous) {
        qc.setQueryData<WorkTask & { comments: WorkTaskComment[] }>(workKeys.task(slug, taskId), {
          ...previous,
          comments: [...(previous.comments ?? []), optimistic],
        });
      }
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workKeys.task(slug, taskId) });
      toast.success("Comment added");
    },
    onError: (err, _body, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(workKeys.task(slug, taskId), ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Could not comment");
    },
  });
}
