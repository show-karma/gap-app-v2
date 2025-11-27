"use client";

import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { RoleManagementTab } from "@/components/Generic/RoleManagement/RoleManagementTab";
import type {
  RoleManagementConfig,
  RoleMember,
  RoleOption,
} from "@/components/Generic/RoleManagement/types";
import { Spinner } from "@/components/Utilities/Spinner";
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import {
  parseReviewerMemberId,
  validateEmail,
  validateTelegram,
  validateWalletAddress,
} from "@/utilities/validators";

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
  const { isCommunityAdmin, isLoading: isLoadingAdmin } = useIsCommunityAdmin(communityId);
  const [selectedRole, setSelectedRole] = useState<ReviewerRole>("program");

  // Fetch program reviewers with mutations
  const {
    data: programReviewers = [],
    isLoading: isLoadingProgramReviewers,
    refetch: refetchProgramReviewers,
    addReviewer: addProgramReviewer,
    removeReviewer: removeProgramReviewer,
  } = useProgramReviewers(programId, chainID);

  // Fetch milestone reviewers with mutations
  const {
    data: milestoneReviewers = [],
    isLoading: isLoadingMilestoneReviewers,
    refetch: refetchMilestoneReviewers,
    addReviewer: addMilestoneReviewer,
    removeReviewer: removeMilestoneReviewer,
  } = useMilestoneReviewers(programId, chainID);

  // Common field configuration for both roles
  const commonFields: RoleManagementConfig["fields"] = useMemo(
    () => [
      {
        name: "publicAddress",
        label: "Wallet Address",
        type: "wallet" as const,
        placeholder: "0x...",
        required: true,
        validation: (value: string) => {
          if (!validateWalletAddress(value)) {
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
          if (!validateEmail(value)) {
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
          if (value && !validateTelegram(value)) {
            return "Please enter a valid Telegram username (5-32 characters)";
          }
          return true;
        },
      },
    ],
    []
  );

  // Configuration for program reviewer role
  const programReviewerConfig: RoleManagementConfig = useMemo(
    () => ({
      roleName: "program-reviewer",
      roleDisplayName: "Program Reviewer",
      fields: commonFields,
      resource: `program_${programId}_${chainID}`,
      canAddMultiple: true,
    }),
    [commonFields, programId, chainID]
  );

  // Configuration for milestone reviewer role
  const milestoneReviewerConfig: RoleManagementConfig = useMemo(
    () => ({
      roleName: "milestone-reviewer",
      roleDisplayName: "Milestone Reviewer",
      fields: commonFields,
      resource: `program_${programId}_${chainID}`,
      canAddMultiple: true,
    }),
    [commonFields, programId, chainID]
  );

  // Role options for the role selector
  const roleOptions: RoleOption[] = useMemo(
    () => [
      {
        value: "program",
        label: "Program Reviewer",
        config: programReviewerConfig,
      },
      {
        value: "milestone",
        label: "Milestone Reviewer",
        config: milestoneReviewerConfig,
      },
    ],
    [programReviewerConfig, milestoneReviewerConfig]
  );

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

  const handleAdd = useCallback(
    async (data: Record<string, string>) => {
      if (selectedRole === "program") {
        await addProgramReviewer(data);
      } else {
        await addMilestoneReviewer(data);
      }
    },
    [selectedRole, addProgramReviewer, addMilestoneReviewer]
  );

  const handleRemove = useCallback(
    async (memberId: string) => {
      // Parse and validate member ID using robust parser
      const parsed = parseReviewerMemberId(memberId);

      if (!parsed.valid) {
        console.error("Invalid member ID:", parsed.error);
        toast.error(parsed.error || "Invalid reviewer ID format");
        return;
      }

      // Type guard ensures we have the required properties
      if (!parsed.role || !parsed.publicAddress) {
        console.error("Missing role or publicAddress in parsed member ID");
        toast.error("Failed to remove reviewer: Invalid ID");
        return;
      }

      try {
        if (parsed.role === "program") {
          await removeProgramReviewer(parsed.publicAddress);
        } else if (parsed.role === "milestone") {
          await removeMilestoneReviewer(parsed.publicAddress);
        } else {
          toast.error(`Unknown reviewer role: ${parsed.role}`);
        }
      } catch (error) {
        // Error handling is already done in the mutations, but we catch here
        // to prevent unhandled promise rejections
        console.error("Error in handleRemove:", error);
      }
    },
    [removeProgramReviewer, removeMilestoneReviewer]
  );

  const handleRefresh = useCallback(() => {
    refetchProgramReviewers();
    refetchMilestoneReviewers();
  }, [refetchProgramReviewers, refetchMilestoneReviewers]);

  const isLoadingReviewers = useMemo(
    () => isLoadingProgramReviewers || isLoadingMilestoneReviewers,
    [isLoadingProgramReviewers, isLoadingMilestoneReviewers]
  );

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
