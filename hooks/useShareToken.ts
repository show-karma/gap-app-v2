import { useMutation, useQueryClient } from "@tanstack/react-query";
import { donorReportQueryKey } from "@/hooks/useDonorReports";
import {
  type GenerateShareTokenRequest,
  generateShareToken,
  revokeShareToken,
} from "@/services/donor-research.service";
import type { ShareTokenPayload } from "@/types/donor-research";

export function useGenerateShareToken() {
  const queryClient = useQueryClient();
  return useMutation<
    ShareTokenPayload,
    Error,
    { reportId: string; body: GenerateShareTokenRequest }
  >({
    mutationFn: ({ reportId, body }) => generateShareToken(reportId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: donorReportQueryKey(variables.reportId),
      });
      queryClient.invalidateQueries({
        queryKey: ["donor-research", "reports"],
      });
    },
  });
}

export function useRevokeShareToken() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { reportId: string }>({
    mutationFn: ({ reportId }) => revokeShareToken(reportId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: donorReportQueryKey(variables.reportId),
      });
      queryClient.invalidateQueries({
        queryKey: ["donor-research", "reports"],
      });
    },
  });
}
