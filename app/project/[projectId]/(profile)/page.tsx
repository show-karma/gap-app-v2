import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { UpdatesContent as DirectUpdatesContent } from "@/components/Pages/Project/v2/Content/UpdatesContent";
import { UpdatesContentSkeleton } from "@/components/Pages/Project/v2/Skeletons";
import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return { title: "Project Updates" };
  }

  const { projectId } = await params;
  const project = await getProjectCachedData(projectId);

  if (!project) {
    return {
      title: "Project Not Found",
      description: "Project not found",
    };
  }

  return generateProjectOverviewMetadata(project, projectId);
}

const DynamicUpdatesContent = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Content/UpdatesContent").then(
      (mod) => mod.UpdatesContent
    ),
  {
    loading: () => <UpdatesContentSkeleton />,
  }
);

const UpdatesContent =
  process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true" ? DirectUpdatesContent : DynamicUpdatesContent;

/**
 * Updates page - the main/default tab for the project profile.
 * Shows the activity feed with milestones and updates.
 */
export default function UpdatesPage() {
  return <UpdatesContent />;
}
