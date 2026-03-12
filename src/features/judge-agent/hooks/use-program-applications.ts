import { useQuery } from "@tanstack/react-query";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";

interface ApplicationsResponse {
  applications: Application[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useProgramApplications(programId: string | undefined) {
  return useQuery({
    queryKey: ["judge-agent-applications", programId],
    queryFn: async () => {
      const [res, err] = await fetchData<ApplicationsResponse>(
        `/v2/funding-applications/program/${programId}?page=1&limit=200`,
        "GET",
        {},
        {},
        {},
        false
      );
      if (err) throw new Error(err);
      return (res as ApplicationsResponse).applications;
    },
    enabled: !!programId,
    staleTime: 2 * 60 * 1000,
  });
}
