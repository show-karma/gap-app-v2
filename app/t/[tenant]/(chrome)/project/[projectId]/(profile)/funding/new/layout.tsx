import type { Metadata } from "next";
import { generateNewGrantMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { NewGrantLayoutClient } from "./NewGrantLayoutClient";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;
  const projectInfo = await getProjectCachedData(projectId);
  return generateNewGrantMetadata(projectInfo, projectId);
}

interface NewGrantLayoutProps {
  children: React.ReactNode;
}

/**
 * New Grant Layout for V2 Profile
 *
 * This layout provides:
 * - Back button to return to funding list
 * - Page title
 * - Form content area
 *
 * Used within the (profile) route group to maintain the main project profile layout
 * while showing the new grant form.
 */
export default function NewGrantLayout({ children }: NewGrantLayoutProps) {
  return <NewGrantLayoutClient>{children}</NewGrantLayoutClient>;
}
