"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import toast from "react-hot-toast";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";

export enum PostApprovalErrorType {
  NETWORK = "NETWORK",
  VALIDATION = "VALIDATION",
  AUTH = "AUTH",
  NOT_FOUND = "NOT_FOUND",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
}

export interface PostApprovalError {
  type: PostApprovalErrorType;
  message: string;
  details?: unknown;
}

function parseErrorType(err: unknown): PostApprovalErrorType {
  const error = err as Record<string, unknown>;
  if (
    error.code === "ECONNABORTED" ||
    error.code === "NETWORK_ERROR" ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  ) {
    return PostApprovalErrorType.NETWORK;
  }
  const status = (error.response as Record<string, unknown>)?.status ?? error.status;
  if (status === 400) return PostApprovalErrorType.VALIDATION;
  if (status === 401 || status === 403) return PostApprovalErrorType.AUTH;
  if (status === 404) return PostApprovalErrorType.NOT_FOUND;
  if (typeof status === "number" && status >= 500) return PostApprovalErrorType.SERVER;

  const message = (typeof error.message === "string" ? error.message : "").toLowerCase();
  if (message.includes("validation") || message.includes("invalid"))
    return PostApprovalErrorType.VALIDATION;
  if (message.includes("unauthorized") || message.includes("authentication"))
    return PostApprovalErrorType.AUTH;

  return PostApprovalErrorType.UNKNOWN;
}

function getErrorMessage(errorType: PostApprovalErrorType, originalMessage?: string): string {
  switch (errorType) {
    case PostApprovalErrorType.NETWORK:
      return "Network error. Please check your connection and try again.";
    case PostApprovalErrorType.VALIDATION:
      return originalMessage || "Please check your form data and try again.";
    case PostApprovalErrorType.AUTH:
      return "Authentication failed. Please reconnect your wallet and try again.";
    case PostApprovalErrorType.NOT_FOUND:
      return "Application not found. Please refresh the page and try again.";
    case PostApprovalErrorType.SERVER:
      return "Server error. Please try again later or contact support.";
    default:
      return originalMessage || "Failed to submit post-approval form. Please try again.";
  }
}

export function usePostApprovalSubmit(
  communityId: string,
  referenceNumber: string,
  application: Application
) {
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (postApprovalData: Record<string, unknown>) => {
      const [response, fetchError] = await fetchData<Application>(
        `/v2/funding-applications/${referenceNumber}/post-approval`,
        "PUT",
        { postApprovalData }
      );
      if (fetchError || !response)
        throw new Error(fetchError ?? "Failed to submit post-approval form");
      return response;
    },
    onSuccess: () => {
      toast.success(
        application.postApprovalData
          ? "Post-approval information updated successfully!"
          : "Post-approval information submitted successfully!"
      );
      queryClient.invalidateQueries({
        queryKey: ["application", communityId, referenceNumber],
      });
    },
    onError: (err) => {
      const errorType = parseErrorType(err);
      const errorMessage = getErrorMessage(
        errorType,
        err instanceof Error ? err.message : undefined
      );
      toast.error(errorMessage);
    },
  });

  const submitPostApprovalForm = useCallback(
    async (postApprovalData: Record<string, unknown>): Promise<boolean> => {
      try {
        await submitMutation.mutateAsync(postApprovalData);
        return true;
      } catch {
        return false;
      }
    },
    [submitMutation]
  );

  const errorType = submitMutation.error ? parseErrorType(submitMutation.error) : null;

  return {
    formData: application.postApprovalData || {},
    submitPostApprovalForm,
    isSubmitting: submitMutation.isPending,
    error:
      submitMutation.error && errorType
        ? ({
            type: errorType,
            message: getErrorMessage(
              errorType,
              submitMutation.error instanceof Error ? submitMutation.error.message : undefined
            ),
          } as PostApprovalError)
        : null,
  };
}
