import { GrantOverview } from "@/components/Pages/Project/Grants/Overview";
import { ProjectGrantsOverviewLoading } from "@/components/Pages/Project/Loading/Grants/Overview";
import { zeroUID } from "@/utilities/commons";
import { envVars } from "@/utilities/enviromentVars";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { defaultMetadata } from "@/utilities/meta";
import { getProjectData } from "@/utilities/queries/getProjectData";

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type Params = Promise<{
  projectId: string;
  grantUid: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const { projectId, grantUid } = awaitedParams;

  const projectInfo = await getProjectData(projectId);

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
      const tabMetadata: Record<
        string,
        {
          title: string;
          description: string;
        }
      > = {
        overview: {
          title: `${grantInfo?.details?.data?.title} Grant Overview | ${projectInfo?.details?.data?.title} | Karma GAP`,
          description:
            `${cleanMarkdownForPlainText(
              grantInfo?.details?.data?.description || "",
              160
            )}` || "",
        },
      };

      metadata = {
        ...metadata,
        title: tabMetadata["overview"]?.title || "",
        description: tabMetadata["overview"]?.description || "",
      };
    }
  } else {
    metadata = {
      ...metadata,
      title: `${projectInfo?.details?.data?.title} | Karma GAP`,
      description: cleanMarkdownForPlainText(
        projectInfo?.details?.data?.description || "",
        80
      ),
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
          alt: metadata.title,
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
          alt: metadata.title,
        },
      ],
    },
    icons: metadata.icons,
  };
}
const Page = () => {
  return (
    <Suspense fallback={<ProjectGrantsOverviewLoading />}>
      <GrantOverview />
    </Suspense>
  );
};

export default Page;
