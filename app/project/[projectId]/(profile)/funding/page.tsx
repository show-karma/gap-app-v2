import type { Metadata } from "next";
import { generateProjectFundingMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { FundingPageClient } from "./FundingPageClient";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);
  return generateProjectFundingMetadata(projectInfo, projectId);
}

/**
 * Funding page - displays the list of grants/funding for the project.
 */
export default function FundingPage() {
  return <FundingPageClient />;
}
