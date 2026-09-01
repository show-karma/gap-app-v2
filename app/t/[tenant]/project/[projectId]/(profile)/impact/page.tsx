import type { Metadata } from "next";
import { generateProjectImpactMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { ImpactPageClient } from "./ImpactPageClient";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);
  return generateProjectImpactMetadata(projectInfo, projectId);
}

/**
 * Impact page - displays project outputs and outcomes.
 */
export default function ImpactPage() {
  return <ImpactPageClient />;
}
