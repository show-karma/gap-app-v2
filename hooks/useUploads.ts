"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { type HermesUploadSummary, hermesClient, type TeamRole } from "@/lib/hermes-client";

// Shared key factories so cache invalidation and consumers agree on shape.
export const chatUploadKeys = {
  all: ["hermes-chat-uploads"] as const,
  list: (slug: string, role: TeamRole) => [...chatUploadKeys.all, slug, role] as const,
};

export const taskAttachmentKeys = {
  all: ["hermes-task-attachments"] as const,
  list: (slug: string, taskId: string) => [...taskAttachmentKeys.all, slug, taskId] as const,
};

// --- Chat uploads --------------------------------------------------------

export function useChatUploads(slug: string | undefined, role: TeamRole) {
  return useQuery<HermesUploadSummary[]>({
    queryKey: chatUploadKeys.list(slug ?? "anon", role),
    enabled: Boolean(slug),
    queryFn: () => hermesClient.listChatUploads(slug as string, role),
  });
}

export function useUploadChatFile(slug: string, role: TeamRole) {
  const qc = useQueryClient();
  return useMutation<HermesUploadSummary, Error, File>({
    mutationFn: (file) => hermesClient.uploadChatFile(slug, role, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatUploadKeys.list(slug, role) });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    },
  });
}

export function useDeleteChatFile(slug: string, role: TeamRole) {
  const qc = useQueryClient();
  return useMutation<{ removed: boolean; sha256: string }, Error, string>({
    mutationFn: (sha256) => hermesClient.deleteChatFile(slug, role, sha256),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatUploadKeys.list(slug, role) });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    },
  });
}

// --- Task attachments ----------------------------------------------------

export function useTaskAttachments(slug: string | undefined, taskId: string | undefined) {
  return useQuery<HermesUploadSummary[]>({
    queryKey: taskAttachmentKeys.list(slug ?? "anon", taskId ?? "anon"),
    enabled: Boolean(slug && taskId),
    queryFn: () => hermesClient.listTaskAttachments(slug as string, taskId as string),
  });
}

export function useUploadTaskAttachment(slug: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation<HermesUploadSummary, Error, File>({
    mutationFn: (file) => hermesClient.uploadTaskAttachment(slug, taskId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskAttachmentKeys.list(slug, taskId) });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    },
  });
}

export function useDeleteTaskAttachment(slug: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation<{ removed: boolean; sha256: string }, Error, string>({
    mutationFn: (sha256) => hermesClient.deleteTaskAttachment(slug, taskId, sha256),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskAttachmentKeys.list(slug, taskId) });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    },
  });
}
