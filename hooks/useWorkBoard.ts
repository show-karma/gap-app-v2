"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  hermesClient,
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
    queryKey: workKeys.list(slug ?? "anon"),
    enabled: Boolean(slug),
    queryFn: () => hermesClient.listWorkTasks(slug as string),
    refetchInterval: 15_000,
  });
}

export function useWorkTask(slug: string | undefined, taskId: string | undefined) {
  return useQuery<WorkTask & { comments: WorkTaskComment[] }>({
    queryKey: workKeys.task(slug ?? "anon", taskId ?? "anon"),
    enabled: Boolean(slug && taskId),
    queryFn: async () => {
      const task = (await hermesClient.getWorkTask(
        slug as string,
        taskId as string
      )) as WorkTask & { comments: WorkTaskComment[] };
      return task;
    },
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
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not add task"),
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
          previous.map((t) =>
            t.id === input.taskId ? { ...t, status: input.status } : t
          )
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

export function useAddWorkComment(slug: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      hermesClient.addWorkTaskComment(slug, taskId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workKeys.task(slug, taskId) });
      toast.success("Comment added");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not comment"),
  });
}
