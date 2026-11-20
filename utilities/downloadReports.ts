import { errorManager } from "@/components/Utilities/errorManager";
import { TokenManager } from "@/utilities/auth/token-manager";
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

const REPORT_FILE_NAME = "grants.csv";

/**
 * Downloads a community report. The request carries the caller's token so the
 * export can include the private columns community admins are entitled to;
 * an anonymous download still works and simply omits them.
 */
export const downloadCommunityReport = async (options: DownloadReportOptions): Promise<void> => {
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

    const token = await TokenManager.getToken();
    const response = await fetch(`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new Error(`Report download failed with status ${response.status}`);
    }

    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = REPORT_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (error: unknown) {
    errorManager("Error downloading report", error);
  }
};
