import { useQuery } from "@tanstack/react-query";
import { getUnlinkedIndicators, UnlinkedIndicator } from "@/utilities/queries/getUnlinkedIndicators";

export const useUnlinkedIndicators = () => {
  return useQuery<UnlinkedIndicator[]>({
    queryKey: ["unlinkedIndicators"],
    queryFn: getUnlinkedIndicators,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}; 