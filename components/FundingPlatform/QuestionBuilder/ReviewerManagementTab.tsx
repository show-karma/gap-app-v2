"use client";

import { UserGroupIcon } from "@heroicons/react/24/solid";
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
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import { parseReviewerMemberId, validateEmail, validateTelegram } from "@/utilities/validators";
import { PAGE_HEADER_CONTENT, PageHeader } from "../PageHeader";

/**
 * Props for ReviewerManagementTab
 */
interface ReviewerManagementTabProps {
  programId: string;
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
  } = useProgramReviewers(programId);

  // Fetch milestone reviewers with mutations
  const {
    data: milestoneReviewers = [],
    isLoading: isLoadingMilestoneReviewers,
    refetch: refetchMilestoneReviewers,
    addReviewer: addMilestoneReviewer,
    removeReviewer: removeMilestoneReviewer,
  } = useMilestoneReviewers(programId);

  // Common field configuration for both roles
  // Uses email-based identification - wallet is generated automatically via Privy
  const commonFields: RoleManagementConfig["fields"] = useMemo(
    () => [
      {
        name: "email",
        label: "Email",
        type: "email" as const,
        placeholder: "reviewer@example.com",
        required: true,
        helperText: "The reviewer will use this email to log in",
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
      resource: `program_${programId}`,
      canAddMultiple: true,
    }),
    [commonFields, programId]
  );

  // Configuration for milestone reviewer role
  const milestoneReviewerConfig: RoleManagementConfig = useMemo(
    () => ({
      roleName: "milestone-reviewer",
      roleDisplayName: "Milestone Reviewer",
      fields: commonFields,
      resource: `program_${programId}`,
      canAddMultiple: true,
    }),
    [commonFields, programId]
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
      id: `program-${reviewer.email}`,
      publicAddress: reviewer.publicAddress,
      email: reviewer.email,
      name: reviewer.name,
      telegram: reviewer.telegram || "",
      assignedAt: reviewer.assignedAt,
      role: "program" as ReviewerRole,
    }));

    const milestoneMembers: ReviewerMemberWithRole[] = milestoneReviewers.map((reviewer) => ({
      id: `milestone-${reviewer.email}`,
      publicAddress: reviewer.publicAddress,
      email: reviewer.email,
      name: reviewer.name,
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
        toast.error(parsed.error || "Invalid reviewer ID format");
        return;
      }

      // Get the identifier (email for new format, publicAddress for legacy)
      const identifier = parsed.email || parsed.publicAddress;

      // Type guard ensures we have the required properties
      if (!parsed.role || !identifier) {
        toast.error("Failed to remove reviewer: Invalid ID");
        return;
      }

      try {
        if (parsed.role === "program") {
          await removeProgramReviewer(identifier);
        } else if (parsed.role === "milestone") {
          await removeMilestoneReviewer(identifier);
        } else {
          toast.error(`Unknown reviewer role: ${parsed.role}`);
        }
      } catch {
        // Error handling is already done in the mutations, but we catch here
        // to prevent unhandled promise rejections
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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={PAGE_HEADER_CONTENT.reviewers.title}
          description={PAGE_HEADER_CONTENT.reviewers.description}
          icon={UserGroupIcon}
        />
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
      </div>
    </div>
  );
};
