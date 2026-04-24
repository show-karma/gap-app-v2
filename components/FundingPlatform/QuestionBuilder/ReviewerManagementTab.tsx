"use client";

import { UserGroupIcon } from "@heroicons/react/24/solid";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { RoleManagementTab } from "@/components/Generic/RoleManagement/RoleManagementTab";
import type {
  ReviewerRole,
  RoleManagementConfig,
  RoleMember,
  RoleOption,
} from "@/components/Generic/RoleManagement/types";
import { Spinner } from "@/components/Utilities/Spinner";
import { useMilestoneReviewers } from "@/hooks/useMilestoneReviewers";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { Permission } from "@/src/core/rbac/types/permission";
import { validateEmail, validateSlack, validateTelegram } from "@/utilities/validators";
import { PAGE_HEADER_CONTENT, PageHeader } from "../PageHeader";

interface ReviewerManagementTabProps {
  programId: string;
  readOnly?: boolean;
}

/**
 * Reviewer management tab specifically for funding platform.
 * Combines program and milestone reviewers into a unified view.
 */
export const ReviewerManagementTab: React.FC<ReviewerManagementTabProps> = ({
  programId,
  readOnly = false,
}) => {
  const { can, isLoading: isLoadingPermissions, isGuestDueToError } = usePermissionContext();
  const canManageReviewers = can(Permission.PROGRAM_MANAGE_REVIEWERS);
  const [selectedRoles, setSelectedRoles] = useState<ReviewerRole[]>(["program"]);

  const {
    data: programReviewers = [],
    isLoading: isLoadingProgramReviewers,
    refetch: refetchProgramReviewers,
    addReviewer: addProgramReviewer,
    removeReviewer: removeProgramReviewer,
    updateReviewerContact: updateProgramReviewerContact,
  } = useProgramReviewers(programId);

  const {
    data: milestoneReviewers = [],
    isLoading: isLoadingMilestoneReviewers,
    refetch: refetchMilestoneReviewers,
    addReviewer: addMilestoneReviewer,
    removeReviewer: removeMilestoneReviewer,
    updateReviewerContact: updateMilestoneReviewerContact,
  } = useMilestoneReviewers(programId);

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
        editable: true,
        validation: (value: string) => {
          if (value && !validateTelegram(value)) {
            return "Please enter a valid Telegram username (5-32 characters)";
          }
          return true;
        },
      },
      {
        name: "slack",
        label: "Slack",
        type: "text" as const,
        placeholder: "@username",
        required: false,
        editable: true,
        validation: (value: string) => {
          if (value && !validateSlack(value)) {
            return "Please enter a valid Slack handle (2-80 characters)";
          }
          return true;
        },
      },
    ],
    []
  );

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

  const roleOptions: RoleOption[] = useMemo(
    () => [
      {
        value: "program",
        label: "App Reviewer",
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

  // Merge program and milestone reviewers by email into combined entries
  const members: RoleMember[] = useMemo(() => {
    const emailToMember = new Map<string, RoleMember>();

    for (const reviewer of programReviewers) {
      if (!reviewer.email) continue;
      const key = reviewer.email.trim().toLowerCase();
      const existing = emailToMember.get(key);
      if (existing) {
        const existingRoles = existing.roles || [];
        if (!existingRoles.includes("program")) {
          existing.roles = [...existingRoles, "program"];
        }
      } else {
        emailToMember.set(key, {
          id: key,
          publicAddress: reviewer.publicAddress,
          name: reviewer.name,
          email: reviewer.email.trim(),
          telegram: reviewer.telegram || "",
          slack: reviewer.slack || "",
          assignedAt: reviewer.assignedAt,
          roles: ["program"],
        });
      }
    }

    for (const reviewer of milestoneReviewers) {
      if (!reviewer.email) continue;
      const key = reviewer.email.trim().toLowerCase();
      const existing = emailToMember.get(key);
      if (existing) {
        const existingRoles = existing.roles || [];
        if (!existingRoles.includes("milestone")) {
          existing.roles = [...existingRoles, "milestone"];
        }
        if (!existing.slack && reviewer.slack) {
          existing.slack = reviewer.slack;
        }
        if (!existing.telegram && reviewer.telegram) {
          existing.telegram = reviewer.telegram;
        }
      } else {
        emailToMember.set(key, {
          id: key,
          publicAddress: reviewer.publicAddress,
          name: reviewer.name,
          email: reviewer.email.trim(),
          telegram: reviewer.telegram || "",
          slack: reviewer.slack || "",
          assignedAt: reviewer.assignedAt,
          roles: ["milestone"],
        });
      }
    }

    return Array.from(emailToMember.values());
  }, [programReviewers, milestoneReviewers]);

  // Add reviewer to all selected roles in parallel, then refetch once
  const handleAdd = useCallback(
    async (data: Record<string, string>) => {
      const promises: Promise<unknown>[] = [];
      if (selectedRoles.includes("program")) {
        promises.push(addProgramReviewer(data));
      }
      if (selectedRoles.includes("milestone")) {
        promises.push(addMilestoneReviewer(data));
      }
      await Promise.all(promises);
    },
    [selectedRoles, addProgramReviewer, addMilestoneReviewer]
  );

  // Remove reviewer from all roles
  const handleRemove = useCallback(
    async (memberId: string) => {
      const memberToRemove = members.find((member) => member.id === memberId);
      if (!memberToRemove) {
        toast.error("Reviewer not found. Please refresh and try again.");
        return;
      }

      if (!memberToRemove.email) {
        toast.error("Reviewer email not available. Please refresh and try again.");
        return;
      }

      const promises: Promise<unknown>[] = [];
      const roles = memberToRemove.roles || [];
      if (roles.includes("program")) {
        promises.push(removeProgramReviewer(memberToRemove.email));
      }
      if (roles.includes("milestone")) {
        promises.push(removeMilestoneReviewer(memberToRemove.email));
      }
      await Promise.all(promises);
    },
    [members, removeProgramReviewer, removeMilestoneReviewer]
  );

  // Edit reviewer roles (add/remove individual roles)
  const handleEditRoles = useCallback(
    async (memberId: string, newRoles: string[]) => {
      const member = members.find((m) => m.id === memberId);
      if (!member || !member.email) {
        toast.error("Reviewer not found. Please refresh and try again.");
        return;
      }

      const currentRoles = member.roles || [];
      const validRoles: ReviewerRole[] = ["program", "milestone"];
      const typedNewRoles = newRoles.filter((r): r is ReviewerRole =>
        validRoles.includes(r as ReviewerRole)
      );

      // If no roles selected, remove entirely
      if (typedNewRoles.length === 0) {
        await handleRemove(memberId);
        return;
      }

      const rolesToAdd = typedNewRoles.filter((r) => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r) => !typedNewRoles.includes(r));

      const reviewerData = {
        name: member.name,
        email: member.email,
        telegram: member.telegram || "",
        slack: member.slack || "",
      };

      for (const role of rolesToAdd) {
        if (role === "program") {
          await addProgramReviewer(reviewerData);
        } else if (role === "milestone") {
          await addMilestoneReviewer(reviewerData);
        }
      }

      for (const role of rolesToRemove) {
        if (role === "program") {
          await removeProgramReviewer(member.email);
        } else if (role === "milestone") {
          await removeMilestoneReviewer(member.email);
        }
      }
    },
    [
      members,
      handleRemove,
      addProgramReviewer,
      addMilestoneReviewer,
      removeProgramReviewer,
      removeMilestoneReviewer,
    ]
  );

  const handleEditContact = useCallback(
    async (memberId: string, patch: Record<string, string>) => {
      const member = members.find((m) => m.id === memberId);
      if (!member || !member.email) {
        toast.error("Reviewer not found. Please refresh and try again.");
        return;
      }

      const contactPayload = {
        email: member.email,
        ...(patch.telegram !== undefined && { telegram: patch.telegram }),
        ...(patch.slack !== undefined && { slack: patch.slack }),
      };

      const roles = member.roles || [];
      const promises: Promise<unknown>[] = [];
      if (roles.includes("program")) {
        promises.push(updateProgramReviewerContact(contactPayload));
      }
      if (roles.includes("milestone")) {
        promises.push(updateMilestoneReviewerContact(contactPayload));
      }

      const results = await Promise.allSettled(promises);
      const firstFailure = results.find((r) => r.status === "rejected");
      if (firstFailure && firstFailure.status === "rejected") {
        throw firstFailure.reason;
      }
    },
    [members, updateProgramReviewerContact, updateMilestoneReviewerContact]
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchProgramReviewers(), refetchMilestoneReviewers()]);
  }, [refetchProgramReviewers, refetchMilestoneReviewers]);

  const isLoadingReviewers = isLoadingProgramReviewers || isLoadingMilestoneReviewers;

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
          selectedRoles={selectedRoles}
          onRolesChange={(roles) => setSelectedRoles(roles as ReviewerRole[])}
          onEditRoles={!readOnly ? handleEditRoles : undefined}
          onEditContact={!readOnly ? handleEditContact : undefined}
        />
      </div>
    </div>
  );
};
