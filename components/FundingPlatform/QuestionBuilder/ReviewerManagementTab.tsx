"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RoleManagementTab,
  RoleManagementConfig,
  RoleMember,
} from "@/components/Generic/RoleManagement/RoleManagementTab";
import { programReviewersService } from "@/services/program-reviewers.service";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { Spinner } from "@/components/Utilities/Spinner";
import { toast } from "react-hot-toast";

/**
 * Props for ReviewerManagementTab
 */
interface ReviewerManagementTabProps {
  programId: string;
  chainID: number;
  communityId: string;
  readOnly?: boolean;
}

/**
 * Reviewer management tab specifically for funding platform
 */
export const ReviewerManagementTab: React.FC<ReviewerManagementTabProps> = ({
  programId,
  chainID,
  communityId,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();
  const { isCommunityAdmin, isLoading: isLoadingAdmin } = useIsCommunityAdmin(communityId);

  // Fetch reviewers
  const {
    data: reviewers = [],
    isLoading: isLoadingReviewers,
    refetch: refetchReviewers,
  } = useQuery({
    queryKey: ["program-reviewers", programId, chainID],
    queryFn: async () => {
      return programReviewersService.getReviewers(programId, chainID);
    },
    enabled: !!programId && !!chainID,
  });

  // Add reviewer mutation
  const addReviewerMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const validation = programReviewersService.validateReviewerData({
        publicAddress: data.publicAddress,
        name: data.name,
        email: data.email,
        telegram: data.telegram,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      return programReviewersService.addReviewer(programId, chainID, {
        publicAddress: data.publicAddress,
        name: data.name,
        email: data.email,
        telegram: data.telegram,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["program-reviewers", programId, chainID] });
      toast.success("Reviewer added successfully");
    },
    onError: (error: any) => {
      console.error("Error adding reviewer:", error);
      toast.error(error.message || "Failed to add reviewer");
    },
  });

  // Remove reviewer mutation
  const removeReviewerMutation = useMutation({
    mutationFn: async (publicAddress: string) => {
      return programReviewersService.removeReviewer(programId, chainID, publicAddress);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["program-reviewers", programId, chainID] });
      toast.success("Reviewer removed successfully");
    },
    onError: (error: any) => {
      console.error("Error removing reviewer:", error);
      toast.error(error.message || "Failed to remove reviewer");
    },
  });

  // Configuration for reviewer role
  const reviewerConfig: RoleManagementConfig = {
    roleName: "reviewer",
    roleDisplayName: "Reviewer",
    fields: [
      {
        name: "publicAddress",
        label: "Wallet Address",
        type: "wallet",
        placeholder: "0x...",
        required: true,
        validation: (value: string) => {
          if (!programReviewersService.validateWalletAddress(value)) {
            return "Please enter a valid Ethereum wallet address";
          }
          return true;
        },
      },
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "John Doe",
        required: true,
        validation: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Name is required";
          }
          return true;
        },
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "reviewer@example.com",
        required: true,
        validation: (value: string) => {
          if (!value) {
            return "Email is required";
          }
          if (!programReviewersService.validateEmail(value)) {
            return "Please enter a valid email address";
          }
          return true;
        },
      },
      {
        name: "telegram",
        label: "Telegram",
        type: "text",
        placeholder: "@username",
        required: false,
        validation: (value: string) => {
          if (value && !programReviewersService.validateTelegram(value)) {
            return "Please enter a valid Telegram username (5-32 characters)";
          }
          return true;
        },
      },
    ],
    resource: `program_${programId}_${chainID}`,
    canAddMultiple: true,
  };

  // Convert reviewers to RoleMember format
  const members: RoleMember[] = reviewers.map((reviewer) => ({
    id: reviewer.publicAddress,
    publicAddress: reviewer.publicAddress,
    name: reviewer.name,
    email: reviewer.email,
    telegram: reviewer.telegram || "",
    assignedAt: reviewer.assignedAt,
  }));

  const handleAdd = async (data: Record<string, string>) => {
    await addReviewerMutation.mutateAsync(data);
  };

  const handleRemove = async (memberId: string) => {
    await removeReviewerMutation.mutateAsync(memberId);
  };

  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isCommunityAdmin && !readOnly) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          You don{"'"}t have permission to manage reviewers for this program.
        </p>
      </div>
    );
  }

  return (
    <RoleManagementTab
      config={reviewerConfig}
      members={members}
      isLoading={isLoadingReviewers}
      canManage={!readOnly && isCommunityAdmin}
      onAdd={!readOnly ? handleAdd : undefined}
      onRemove={!readOnly ? handleRemove : undefined}
      onRefresh={refetchReviewers}
    />
  );
};