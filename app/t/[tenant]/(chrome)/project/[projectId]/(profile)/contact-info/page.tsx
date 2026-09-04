import type { Metadata } from "next";
import { generateProjectContactMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { ContactInfoPageClient } from "./ContactInfoPageClient";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);
  return generateProjectContactMetadata(projectInfo, projectId);
}

/**
 * Contact Info Page (V2)
 *
 * Displays contact information for the project.
 * Uses the profile layout context for consistent navigation.
 * Only accessible to authorized users (Project Admin, Project Owner, Staff, Contract Owner).
 */
export default function ContactInfoPageV2() {
  return <ContactInfoPageClient />;
}
