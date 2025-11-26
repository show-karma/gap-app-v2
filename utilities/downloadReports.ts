import { errorManager } from "@/components/Utilities/errorManager";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

interface DownloadReportOptions {
  communityId: string;
  sortBy?: string;
  selectedProgramIds?: string[];
  page?: number;
  pageLimit?: number;
  status?: string;
}

/**
 * Utility function to download community reports
 * @param options DownloadReportOptions containing communityId and optional filtering parameters
 */
export const downloadCommunityReport = (options: DownloadReportOptions): void => {
  const {
    communityId,
    sortBy = "totalMilestones",
    selectedProgramIds = [],
    page = 0,
    pageLimit = 9999999,
    status = "all",
  } = options;

  const programFilter = selectedProgramIds.filter((value) => Boolean(value)).join(",");

  try {
    const path = INDEXER.COMMUNITY.GRANTS(communityId, {
      page,
      pageLimit,
      sort: sortBy,
      status,
      selectedProgramId: programFilter || undefined,
      download: true,
    });

    const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${path}`;
    window.open(url, "_blank");
  } catch (error: any) {
    errorManager("Error downloading report", error);
  }
};
