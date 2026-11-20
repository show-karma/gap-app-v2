import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  type FollowUpPlaybookResult,
  fetchFollowUpPlaybook,
  saveFollowUpPlaybook,
} from "@/services/followUpAgent.service";

export function useFollowUpPlaybook(programId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.followUpPlaybook(programId),
    queryFn: () => fetchFollowUpPlaybook(programId),
    enabled: !!programId,
  });
}

export function useSaveFollowUpPlaybook(programId: string) {
  const queryClient = useQueryClient();
  const key = QUERY_KEYS.followUpPlaybook(programId);

  return useMutation({
    mutationFn: (content: string) => saveFollowUpPlaybook(programId, content),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FollowUpPlaybookResult>(key);
      if (previous) {
        queryClient.setQueryData<FollowUpPlaybookResult>(key, {
          ...previous,
          playbook: { ...previous.playbook, content, isDefault: false },
        });
      }
      return { previous };
    },
    onError: (error: Error, _content, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(error.message || "We couldn't save the playbook. Try again.");
    },
    onSuccess: (saved) => {
      toast.success(`Playbook saved as version ${saved.version}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
