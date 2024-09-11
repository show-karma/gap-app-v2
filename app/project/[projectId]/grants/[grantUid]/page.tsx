import { GrantOverview } from "@/components/Pages/Project/Grants/Overview";
import { zeroUID } from "@/utilities/commons";
import { fetchFromLocalApi } from "@/utilities/fetchFromServer";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
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

  const projectInfo = await gapIndexerApi
    .projectBySlug(projectId as `0x${string}`)
    .then((res) => res.data)
    .catch(() => notFound());

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
            `${grantInfo?.details?.data?.description?.slice(0, 160)}${
              grantInfo?.details?.data?.description &&
              grantInfo?.details?.data?.description?.length >= 160
                ? "..."
                : ""
            }` || "",
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
      images: [
        {
          url: `https://gap-app-v2-git-feat-metadata-og-karma-devs.vercel.app/api/metadata/projects/${projectId}`,
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
          url: `https://gap-app-v2-git-feat-metadata-og-karma-devs.vercel.app/api/metadata/projects/${projectId}`,
          alt: metadata.title,
        },
      ],
    },
    icons: metadata.icons,
  };
}

const Page = () => {
  return <GrantOverview />;
};

export default Page;
