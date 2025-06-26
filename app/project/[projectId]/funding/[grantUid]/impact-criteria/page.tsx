import { GrantImpactCriteria } from "@/components/Pages/Grants/ImpactCriteria";
import { zeroUID } from "@/utilities/commons";
import { envVars } from "@/utilities/enviromentVars";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { defaultMetadata } from "@/utilities/meta";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";
import { Metadata } from "next";
import { notFound } from "next/navigation";

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
        title: `Impact Criteria for ${grantInfo?.details?.data?.title} Grant | ${projectInfo?.details?.data?.title} | Karma GAP`,
        description: `Impact criteria defined by ${projectInfo?.details?.data?.title} for ${grantInfo?.details?.data?.title} grant.`,
      };

      metadata = {
        ...metadata,
        title: pageMetadata.title || pageMetadata.title || "",
        description: pageMetadata.description || pageMetadata.description || "",
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
export default function Page() {
  return <GrantImpactCriteria />;
}
