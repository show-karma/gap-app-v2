"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RoleManagementTab } from "@/components/Generic/RoleManagement/RoleManagementTab";
import type {
  RoleManagementConfig,
  RoleMember,
  RoleOption,
} from "@/components/Generic/RoleManagement/types";
import { programReviewersService } from "@/services/program-reviewers.service";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { Spinner } from "@/components/Utilities/Spinner";
import { toast } from "react-hot-toast";
import { useQuery, useMutation } from "@tanstack/react-query";

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
 * Reviewer role type
 */
type ReviewerRole = "program" | "milestone";

/**
 * Extended role member with role type
 */
interface ReviewerMemberWithRole extends RoleMember {
  role: ReviewerRole;
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
  const [selectedRole, setSelectedRole] = useState<ReviewerRole>("program");

  // Fetch program reviewers
  const {
    data: programReviewers = [],
    isLoading: isLoadingProgramReviewers,
    refetch: refetchProgramReviewers,
  } = useQuery({
    queryKey: ["program-reviewers", programId, chainID],
    queryFn: async () => {
      return programReviewersService.getReviewers(programId, chainID);
    },
    enabled: !!programId && !!chainID,
  });

  // Fetch milestone reviewers with mutations
  const {
    data: milestoneReviewers = [],
    isLoading: isLoadingMilestoneReviewers,
    refetch: refetchMilestoneReviewers,
    addReviewer: addMilestoneReviewer,
    removeReviewer: removeMilestoneReviewer,
  } = useMilestoneReviewers(programId, chainID);

  // Add program reviewer mutation
  const addProgramReviewerMutation = useMutation({
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
      toast.success("Program reviewer added successfully");
    },
    onError: (error: any) => {
      console.error("Error adding program reviewer:", error);
      toast.error(error.message || "Failed to add program reviewer");
    },
  });

  // Remove program reviewer mutation
  const removeProgramReviewerMutation = useMutation({
    mutationFn: async (publicAddress: string) => {
      return programReviewersService.removeReviewer(programId, chainID, publicAddress);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["program-reviewers", programId, chainID] });
      toast.success("Program reviewer removed successfully");
    },
    onError: (error: any) => {
      console.error("Error removing program reviewer:", error);
      toast.error(error.message || "Failed to remove program reviewer");
    },
  });


  // Common field configuration for both roles
  const commonFields: RoleManagementConfig["fields"] = useMemo(() => [
    {
      name: "publicAddress",
      label: "Wallet Address",
      type: "wallet" as const,
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
      type: "text" as const,
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
      type: "email" as const,
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
      type: "text" as const,
      placeholder: "@username",
      required: false,
      validation: (value: string) => {
        if (value && !programReviewersService.validateTelegram(value)) {
          return "Please enter a valid Telegram username (5-32 characters)";
        }
        return true;
      },
    },
  ], []);

  // Configuration for program reviewer role
  const programReviewerConfig: RoleManagementConfig = useMemo(() => ({
    roleName: "program-reviewer",
    roleDisplayName: "Program Reviewer",
    fields: commonFields,
    resource: `program_${programId}_${chainID}`,
    canAddMultiple: true,
  }), [commonFields, programId, chainID]);

  // Configuration for milestone reviewer role
  const milestoneReviewerConfig: RoleManagementConfig = useMemo(() => ({
    roleName: "milestone-reviewer",
    roleDisplayName: "Milestone Reviewer",
    fields: commonFields,
    resource: `program_${programId}_${chainID}`,
    canAddMultiple: true,
  }), [commonFields, programId, chainID]);

  // Role options for the role selector
  const roleOptions: RoleOption[] = useMemo(() => [
    { value: "program", label: "Program Reviewer", config: programReviewerConfig },
    { value: "milestone", label: "Milestone Reviewer", config: milestoneReviewerConfig },
  ], [programReviewerConfig, milestoneReviewerConfig]);

  // Merge reviewers from both types with role information
  const members: ReviewerMemberWithRole[] = useMemo(() => {
    const programMembers: ReviewerMemberWithRole[] = programReviewers.map((reviewer) => ({
      id: `program-${reviewer.publicAddress}`,
      publicAddress: reviewer.publicAddress,
      name: reviewer.name,
      email: reviewer.email,
      telegram: reviewer.telegram || "",
      assignedAt: reviewer.assignedAt,
      role: "program" as ReviewerRole,
    }));

    const milestoneMembers: ReviewerMemberWithRole[] = milestoneReviewers.map((reviewer) => ({
      id: `milestone-${reviewer.publicAddress}`,
      publicAddress: reviewer.publicAddress,
      name: reviewer.name,
      email: reviewer.email,
      telegram: reviewer.telegram || "",
      assignedAt: reviewer.assignedAt,
      role: "milestone" as ReviewerRole,
    }));

    return [...programMembers, ...milestoneMembers];
  }, [programReviewers, milestoneReviewers]);

  const handleAdd = useCallback(async (data: Record<string, string>) => {
    if (selectedRole === "program") {
      await addProgramReviewerMutation.mutateAsync(data);
    } else {
      await addMilestoneReviewer(data);
    }
  }, [selectedRole, addProgramReviewerMutation, addMilestoneReviewer]);

  const handleRemove = useCallback(async (memberId: string) => {
    // Extract role and address from memberId
    const [role, publicAddress] = memberId.split("-", 2);

    if (role === "program") {
      await removeProgramReviewerMutation.mutateAsync(publicAddress);
    } else {
      await removeMilestoneReviewer(publicAddress);
    }
  }, [removeProgramReviewerMutation, removeMilestoneReviewer]);

  const handleRefresh = useCallback(() => {
    refetchProgramReviewers();
    refetchMilestoneReviewers();
  }, [refetchProgramReviewers, refetchMilestoneReviewers]);

  const isLoadingReviewers = isLoadingProgramReviewers || isLoadingMilestoneReviewers;

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
      config={programReviewerConfig}
      members={members}
      isLoading={isLoadingReviewers}
      canManage={!readOnly && isCommunityAdmin}
      onAdd={!readOnly ? handleAdd : undefined}
      onRemove={!readOnly ? handleRemove : undefined}
      onRefresh={handleRefresh}
      roleOptions={roleOptions}
      selectedRole={selectedRole}
      onRoleChange={(role) => setSelectedRole(role as ReviewerRole)}
    />
  );
};