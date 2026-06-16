import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { UpdatesContent as DirectUpdatesContent } from "@/components/Pages/Project/v2/Content/UpdatesContent";
import { ActivityFeedStatic } from "@/components/Pages/Project/v2/MainContent/ActivityFeedStatic";
import { UpdatesContentSkeleton } from "@/components/Pages/Project/v2/Skeletons";
import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { getProjectFeed } from "@/utilities/queries/getProjectFeed.server";

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
 *
 * Server-fetches the activity feed and passes a read-only twin
 * (ActivityFeedStatic) as `serverFeed` so the project's milestone/update
 * content is present in the initial HTML for crawlers; the interactive client
 * feed replaces it on hydration.
 */
export default async function UpdatesPage({ params }: { params: Params }) {
  // Skip the server feed fetch under E2E — the staging API may be unreachable
  // from CI and would hang the render (same rationale as generateMetadata).
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return <UpdatesContent />;
  }

  const { projectId } = await params;
  const feed = await getProjectFeed(projectId);

  return (
    <UpdatesContent serverFeed={feed.length ? <ActivityFeedStatic milestones={feed} /> : null} />
  );
}
