import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { editMilestone, type MilestoneEditData } from "@/services/milestones";

interface UseMilestoneEditOptions {
  milestoneUID: string;
  projectId: string;
}

interface MilestoneEditVariables {
  data: MilestoneEditData;
}

export function useMilestoneEdit({ milestoneUID, projectId }: UseMilestoneEditOptions) {
  const queryClient = useQueryClient();

  const updatesQueryKey = ["projectUpdates", projectId];
  const grantsQueryKey = ["projectGrants"];

  const mutation = useMutation({
    mutationFn: async ({ data }: MilestoneEditVariables) => {
      return editMilestone(milestoneUID, data);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: updatesQueryKey });
      await queryClient.cancelQueries({ queryKey: grantsQueryKey });

      const previousUpdates = queryClient.getQueryData(updatesQueryKey);
      const previousGrants = queryClient.getQueryData(grantsQueryKey);

      return { previousUpdates, previousGrants };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousUpdates) {
        queryClient.setQueryData(updatesQueryKey, context.previousUpdates);
      }
      if (context?.previousGrants) {
        queryClient.setQueryData(grantsQueryKey, context.previousGrants);
      }
      toast.error("Failed to update milestone. Please try again.");
    },
    onSuccess: () => {
      toast.success("Milestone updated successfully.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: updatesQueryKey });
      queryClient.invalidateQueries({ queryKey: grantsQueryKey });
    },
  });

  return {
    editMilestone: mutation.mutate,
    editMilestoneAsync: mutation.mutateAsync,
    isEditing: mutation.isPending,
    editError: mutation.error,
  };
}
