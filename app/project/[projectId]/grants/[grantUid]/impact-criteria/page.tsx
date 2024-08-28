import { GrantImpactCriteria } from "@/components/Pages/Grants/ImpactCriteria";
import { zeroUID } from "@/utilities/commons";
import { fetchFromLocalApi } from "@/utilities/fetchFromServer";
import { defaultMetadata } from "@/utilities/meta";
import {
  IGrantResponse,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: {
    projectId: string;
    grantUid: string;
  };
}): Promise<Metadata> {
  const projectId = params?.projectId as string;
  const grantUid = params?.grantUid as string;

  const projectInfo = await fetchFromLocalApi<IProjectResponse>(
    `/metadata?type=project&uid=${projectId}`
  );

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
    const grantInfo = await fetchFromLocalApi<IGrantResponse>(
      `/metadata?type=grant&uid=${grantUid}`
    );
    if (grantInfo) {
      const pageMetadata = {
        title: `Karma GAP - ${projectInfo?.details?.data?.title} - ${grantInfo?.details?.data?.title} grant impact criteria`,
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
      title: `Karma GAP - ${projectInfo?.details?.data?.title}`,
      description:
        projectInfo?.details?.data?.description?.substring(0, 80) || "",
    };
  }

  return {
    title: metadata.title,
    description: metadata.description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: metadata.title,
      description: metadata.description,
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: metadata.title,
      })),
      // site_name: defaultMetadata.openGraph.siteName,
    },
    icons: metadata.icons,
  };
}

export default function Page() {
  return <GrantImpactCriteria />;
}
