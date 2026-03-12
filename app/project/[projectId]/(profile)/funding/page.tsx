import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { generateProjectFundingMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

const FundingPageClient = dynamic(() => import("./FundingPageClient"));

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return { title: "Project Funding" };
  }

  const { projectId } = await params;
  const project = await getProjectCachedData(projectId);

  if (!project) {
    return {
      title: "Project Not Found",
      description: "Project not found",
    };
  }

  return generateProjectFundingMetadata(project, projectId);
}

/**
 * Funding page - displays the list of grants/funding for the project.
 */
export default function FundingPage() {
  return <FundingPageClient />;
}
