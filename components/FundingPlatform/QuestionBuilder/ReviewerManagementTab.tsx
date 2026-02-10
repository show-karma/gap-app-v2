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
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types/permission";
import { validateEmail, validateTelegram } from "@/utilities/validators";
import { PAGE_HEADER_CONTENT, PageHeader } from "../PageHeader";

/**
 * Props for ReviewerManagementTab
 */
interface ReviewerManagementTabProps {
  programId: string;
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

function buildReviewerMemberId(
  role: ReviewerRole,
  reviewer: { publicAddress?: string; email: string; name: string; assignedAt: string }
): string {
  const normalizedIdentifier =
    reviewer.publicAddress?.trim().toLowerCase() || reviewer.email.trim().toLowerCase();

  if (normalizedIdentifier) {
    return `${role}-${normalizedIdentifier}`;
  }

  const normalizedName = reviewer.name.trim().toLowerCase().replace(/\s+/g, "-");
  return `${role}-${normalizedName || "unknown"}-${reviewer.assignedAt}`;
}

/**
 * Reviewer management tab specifically for funding platform
 */
export const ReviewerManagementTab: React.FC<ReviewerManagementTabProps> = ({
  programId,
  readOnly = false,
}) => {
  const { can, isLoading: isLoadingPermissions, isGuestDueToError } = usePermissionContext();
  const canManageReviewers = can(Permission.PROGRAM_MANAGE_REVIEWERS);
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
  const commonFields: RoleManagementConfig["fields"] = useMemo(
    () => [
      {
        name: "email",
        label: "Email",
        type: "email" as const,
        placeholder: "reviewer@example.com",
        required: true,
        helperText: "This email will be used to log in as a reviewer",
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
      id: buildReviewerMemberId("program", reviewer),
      publicAddress: reviewer.publicAddress,
      name: reviewer.name,
      email: reviewer.email,
      telegram: reviewer.telegram || "",
      assignedAt: reviewer.assignedAt,
      role: "program" as ReviewerRole,
    }));

    const milestoneMembers: ReviewerMemberWithRole[] = milestoneReviewers.map((reviewer) => ({
      id: buildReviewerMemberId("milestone", reviewer),
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
      const memberToRemove = members.find((member) => member.id === memberId);
      if (!memberToRemove) {
        toast.error("Reviewer not found. Please refresh and try again.");
        return;
      }

      if (!memberToRemove.publicAddress) {
        toast.error("This reviewer is still being provisioned. Refresh and try again.");
        return;
      }

      try {
        if (memberToRemove.role === "program") {
          await removeProgramReviewer(memberToRemove.publicAddress);
        } else if (memberToRemove.role === "milestone") {
          await removeMilestoneReviewer(memberToRemove.publicAddress);
        } else {
          toast.error(`Unknown reviewer role: ${memberToRemove.role}`);
        }
      } catch {
        // Error handling is already done in the mutations, but we catch here
        // to prevent unhandled promise rejections
      }
    },
    [members, removeProgramReviewer, removeMilestoneReviewer]
  );

  const handleRefresh = useCallback(() => {
    refetchProgramReviewers();
    refetchMilestoneReviewers();
  }, [refetchProgramReviewers, refetchMilestoneReviewers]);

  const isLoadingReviewers = useMemo(
    () => isLoadingProgramReviewers || isLoadingMilestoneReviewers,
    [isLoadingProgramReviewers, isLoadingMilestoneReviewers]
  );

  if (isLoadingPermissions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isGuestDueToError && !readOnly) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Unable to verify your permissions right now. Please refresh and try again.
        </p>
      </div>
    );
  }

  if (!canManageReviewers && !readOnly) {
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
          canManage={!readOnly && canManageReviewers}
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
