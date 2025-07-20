import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { Suspense } from "react";
import { envVars } from "@/config/env";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { ProjectGrantsMilestonesAndUpdatesLoading } from "@/features/projects/components/loading/Grants/MilestonesAndUpdate";
import MilestonesAndUpdates from "@/features/grants/components/grant-page/MilestonesAndUpdates";

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { projectId, grantUid } = await params;

  const projectInfo = await getProjectCachedData(projectId);

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    notFound();
  }
  let metadata = {
    title: defaultMetadata.title,
    description: defaultMetadata.description,
    twitter: defaultMetadata.twitter,
    openGraph: defaultMetadata.openGraph,
    icons: defaultMetadata.icons,
  };
  if (grantUid) {
    const grantInfo = await gapIndexerApi
      .grantBySlug(grantUid as `0x${string}`)
      .then((res) => res.data)
      .catch(() => notFound());
    if (grantInfo) {
      const pageMetadata = {
        title: `${projectInfo?.details?.data?.title} - Milestones and Updates for ${grantInfo?.details?.data.title} | Karma GAP`,
        description: `View all milestones and updates by ${projectInfo?.details?.data?.title} for ${grantInfo?.details?.data.title} grant.`,
      };

      metadata = {
        ...metadata,
        title: pageMetadata?.title || pageMetadata?.title || "",
        description:
          pageMetadata?.description || pageMetadata?.description || "",
      };
    }
  } else {
    metadata = {
      ...metadata,
      title: `${projectInfo?.details?.data?.title} | Karma GAP`,
      description:
        cleanMarkdownForPlainText(
          projectInfo?.details?.data?.description || "",
          80
        ) || "",
    };
  }

  return {
    title: metadata.title,
    description: metadata.description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title || defaultMetadata.title,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: metadata.title,
      description: metadata.description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title || defaultMetadata.title,
        },
      ],
      // site_name: defaultMetadata.openGraph.siteName,
    },
    icons: metadata.icons,
  };
}
const Page = () => {
  return (
    <Suspense fallback={<ProjectGrantsMilestonesAndUpdatesLoading />}>
      <MilestonesAndUpdates />
    </Suspense>
  );
};

export default Page;
