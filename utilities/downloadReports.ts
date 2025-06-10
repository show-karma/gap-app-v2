import { errorManager } from "@/components/Utilities/errorManager";
import { INDEXER } from "@/utilities/indexer";
import { envVars } from "@/utilities/enviromentVars";

interface DownloadReportOptions {
  communityId: string;
  sortBy?: string;
  selectedGrantTitles?: string[];
  page?: number;
  pageLimit?: number;
  status?: string;
}

/**
 * Utility function to download community reports
 * @param options DownloadReportOptions containing communityId and optional filtering parameters
 */
export const downloadCommunityReport = (
  options: DownloadReportOptions
): void => {
  const {
    communityId,
    sortBy = "totalMilestones",
    selectedGrantTitles = [],
    page = 0,
    pageLimit = 9999999,
    status = "all",
  } = options;

  try {
    const path = INDEXER.COMMUNITY.GRANTS(communityId, {
      page,
      pageLimit,
      sort: sortBy,
      status,
      grantTitle:
        selectedGrantTitles.length > 0
          ? encodeURIComponent(selectedGrantTitles.join(","))
          : undefined,
      download: true,
    });

    const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${path}`;
    window.open(url, "_blank");
  } catch (error: any) {
    errorManager("Error downloading report", error);
  }
};
