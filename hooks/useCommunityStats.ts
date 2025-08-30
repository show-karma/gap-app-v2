import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { errorManager } from "@/components/Utilities/errorManager";
import { INDEXER } from "@/utilities/indexer";
import formatCurrency from "@/utilities/formatCurrency";

interface CommunityStatsResponse {
  activeCommunities: number;
  milestonesCompleted: number;
  projectsFunded: number;
  totalGrantsUSD: number;
}

interface SummaryStats {
  title: string;
  value: string | number;
}

export const useCommunityStats = () => {
  return useQuery<SummaryStats[], Error>({
    queryKey: ["community-stats"],
    queryFn: async (): Promise<SummaryStats[]> => {
      try {
        const endpoint = INDEXER.COMMUNITY.GLOBAL_STATS();
        const [response, error] = await fetchData(endpoint, "GET", {}, {}, {}, false);
        
        if (error) {
          throw new Error(error);
        }
        
        if (!response) {
          throw new Error("No response received");
        }

        const data = response as CommunityStatsResponse;
        
        // Transform the API response to match the expected format
        return [
          { 
            title: "Active Communities", 
            value: data.activeCommunities 
          },
          { 
            title: "Projects Funded", 
            value: data.projectsFunded 
          },
          { 
            title: "Grants Tracked", 
            value: `$${formatCurrency(data.totalGrantsUSD)}` 
          },
          { 
            title: "Milestones Completed", 
            value: data.milestonesCompleted 
          },
        ];
      } catch (error: any) {
        errorManager("Error fetching community stats", error);
        throw error;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 2,
  });
};

export type { CommunityStatsResponse, SummaryStats }; 