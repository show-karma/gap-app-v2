"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { type AIAgentUploadSummary, aiAgentClient, type TeamRole } from "@/lib/ai-agent-client";

// Shared key factories so cache invalidation and consumers agree on shape.
export const chatUploadKeys = {
  all: ["ai-agent-chat-uploads"] as const,
  list: (slug: string, role: TeamRole) => [...chatUploadKeys.all, slug, role] as const,
};

export const taskAttachmentKeys = {
  all: ["ai-agent-task-attachments"] as const,
  list: (slug: string, taskId: string) => [...taskAttachmentKeys.all, slug, taskId] as const,
};

// --- Chat uploads --------------------------------------------------------

export function useChatUploads(slug: string | undefined, role: TeamRole) {
  return useQuery<AIAgentUploadSummary[]>({
    queryKey: chatUploadKeys.list(slug ?? "anon", role),
    enabled: Boolean(slug),
    queryFn: () => aiAgentClient.listChatUploads(slug as string, role),
  });
}

export function useUploadChatFile(slug: string, role: TeamRole) {
  const qc = useQueryClient();
  return useMutation<AIAgentUploadSummary, Error, File>({
    mutationFn: (file) => aiAgentClient.uploadChatFile(slug, role, file),
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
    mutationFn: (sha256) => aiAgentClient.deleteChatFile(slug, role, sha256),
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
  return useQuery<AIAgentUploadSummary[]>({
    queryKey: taskAttachmentKeys.list(slug ?? "anon", taskId ?? "anon"),
    enabled: Boolean(slug && taskId),
    queryFn: () => aiAgentClient.listTaskAttachments(slug as string, taskId as string),
  });
}

export function useUploadTaskAttachment(slug: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation<AIAgentUploadSummary, Error, File>({
    mutationFn: (file) => aiAgentClient.uploadTaskAttachment(slug, taskId, file),
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
    mutationFn: (sha256) => aiAgentClient.deleteTaskAttachment(slug, taskId, sha256),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskAttachmentKeys.list(slug, taskId) });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    },
  });
}
