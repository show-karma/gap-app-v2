"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { transformDataForSubmission } from "@/src/features/applications/lib/form-utils";
import type { ApplicationFormData } from "@/src/features/applications/types";
import { applicationKeys } from "@/src/lib/query-keys";
import type { Application } from "@/types/whitelabel-entities";
import { track } from "@/utilities/analytics/client";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";

interface UpdateApplicationVariables {
  applicationData: Record<string, unknown>;
  saveAsDraft?: boolean;
}

const SUBMIT_SUCCESS_MESSAGES: Partial<Record<Application["status"], string>> = {
  revision_requested: "Application resubmitted for review",
  draft: "Application submitted",
};

const getSubmitSuccessMessage = (status: Application["status"]) =>
  SUBMIT_SUCCESS_MESSAGES[status] ?? "Application updated successfully";

const getUpdateErrorFallback = (saveAsDraft?: boolean) =>
  saveAsDraft ? "Failed to save draft" : "Failed to update application";

const toUpdateBody = ({ applicationData, saveAsDraft }: UpdateApplicationVariables) =>
  saveAsDraft ? { applicationData, saveAsDraft: true } : { applicationData };

export function useApplicationUpdate(communityId: string, application: Application) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (variables: UpdateApplicationVariables) =>
      // TODO: add zod schema
      api.put<Application>(
        INDEXER.V2.FUNDING_APPLICATIONS.GET(application.referenceNumber),
        toUpdateBody(variables)
      ),
    onSuccess: (updated, { saveAsDraft }) => {
      if (updated) {
        queryClient.setQueryData(
          applicationKeys.detail(communityId, application.referenceNumber, true),
          updated
        );
      }
      queryClient.invalidateQueries({
        queryKey: ["application", communityId, application.referenceNumber],
      });
      const analyticsBase = { program_id: application.programId, community_id: communityId };
      if (saveAsDraft) {
        track("application_draft_saved", { ...analyticsBase, is_new: false });
        toast.success("Draft saved");
        return;
      }
      if (application.status === "draft") {
        track("application_submitted", { ...analyticsBase, time_to_submit_s: null });
      }
      toast.success(getSubmitSuccessMessage(application.status));
      router.push(PAGES.COMMUNITY.APPLICATION_DETAIL(communityId, application.referenceNumber));
      router.refresh();
    },
    onError: (error: Error, { saveAsDraft }) => {
      toast.error(error.message || getUpdateErrorFallback(saveAsDraft));
    },
  });

  const submit = async (applicationData: Record<string, unknown>) => {
    await updateMutation.mutateAsync({ applicationData });
  };

  const saveDraft =
    application.status === "draft"
      ? (data: ApplicationFormData) =>
          updateMutation.mutate({
            applicationData: transformDataForSubmission(data),
            saveAsDraft: true,
          })
      : undefined;

  return {
    submit,
    saveDraft,
    isSavingDraft: updateMutation.isPending && updateMutation.variables?.saveAsDraft === true,
  };
}
