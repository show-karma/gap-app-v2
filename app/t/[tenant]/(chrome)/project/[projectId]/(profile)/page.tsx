import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { UpdatesContent as DirectUpdatesContent } from "@/components/Pages/Project/v2/Content/UpdatesContent";
import { ActivityFeedStatic } from "@/components/Pages/Project/v2/MainContent/ActivityFeedStatic";
import { ServerFeedSlot } from "@/components/Pages/Project/v2/MainContent/ServerFeedSlot";
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
 * Server-fetches the activity feed and renders a read-only twin
 * (ActivityFeedStatic) as a SIBLING of the client component so the project's
 * milestone/update content is present in the initial HTML for crawlers; the
 * interactive client feed replaces it once it has data.
 *
 * The twin used to be passed to `UpdatesContent` as a `serverFeed` prop. That
 * component is a Client Component calling `useSearchParams()`, which aborts a
 * prerender unconditionally, and the abort covers its whole subtree — a
 * server-rendered prop included. So the twin was doing the work on the server
 * and shipping only as flight data: the feed strings were in the page's script
 * payload and absent from its markup, which the non-flip control renders
 * (E-7b). As a sibling it sits above the abort and prerenders, and it is no
 * longer coupled to whether the client component happens to read the URL — the
 * property that survives the next merge, since `main` re-adds those reads.
 */
export default async function UpdatesPage({ params }: { params: Params }) {
  // Skip the server feed fetch under E2E — the staging API may be unreachable
  // from CI and would hang the render (same rationale as generateMetadata).
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true") {
    return <UpdatesContent />;
  }

  const { projectId } = await params;
  const feed = await getProjectFeed(projectId);

  const hasServerFeed = feed.length > 0;

  return (
    <>
      {hasServerFeed ? (
        <ServerFeedSlot>
          <ActivityFeedStatic milestones={feed} />
        </ServerFeedSlot>
      ) : null}
      <UpdatesContent hasServerFeed={hasServerFeed} />
    </>
  );
}
