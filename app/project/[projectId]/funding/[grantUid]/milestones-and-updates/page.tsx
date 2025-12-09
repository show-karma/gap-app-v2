import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MilestonesAndUpdates from "@/components/Pages/Grants/MilestonesAndUpdates";
import { ProjectGrantsMilestonesAndUpdatesLoading } from "@/components/Pages/Project/Loading/Grants/MilestonesAndUpdate";
import { PROJECT_NAME } from "@/constants/brand";
import { getProjectGrants } from "@/services/project-grants.service";
import { zeroUID } from "@/utilities/commons";
import { envVars } from "@/utilities/enviromentVars";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { defaultMetadata } from "@/utilities/meta";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
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
    // Fetch grants using V2 endpoint and find the specific grant
    const grants = await getProjectGrants(projectId);
    const grantInfo = grants.find((g) => g.uid.toLowerCase() === grantUid.toLowerCase());

    if (!grantInfo) {
      notFound();
    }

    const pageMetadata = {
      title: `${projectInfo?.details?.title} - Milestones and Updates for ${grantInfo.details?.title} | ${PROJECT_NAME}`,
      description: `View all milestones and updates by ${projectInfo?.details?.title} for ${grantInfo.details?.title} grant.`,
    };

    metadata = {
      ...metadata,
      title: pageMetadata.title || "",
      description: pageMetadata.description || "",
    };
  } else {
    metadata = {
      ...metadata,
      title: `${projectInfo?.details?.title} | ${PROJECT_NAME}`,
      description: cleanMarkdownForPlainText(projectInfo?.details?.description || "", 80) || "",
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
