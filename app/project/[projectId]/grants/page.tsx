import { ProjectGrantsPage } from "@/components/Pages/Project/ProjectGrantsPage";
/* eslint-disable @next/next/no-img-element */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { IGrantDetails, IProjectDetails } from "@show-karma/karma-gap-sdk";

import { Hex } from "viem";
import { Metadata } from "next";

import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: {
    projectId: string;
  };
  searchParams: {
    grantId: string;
    tab: string;
  };
}): Promise<Metadata> {
  const projectId = params?.projectId as string;
  const grant = searchParams?.grantId as string | undefined;
  const tab = searchParams?.tab as string | undefined;

  const projectInfo = await getMetadata<IProjectDetails>(
    "projects",
    projectId as Hex
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
  if (grant && tab) {
    const grantInfo = await getMetadata<IGrantDetails>("grants", grant as Hex);
    if (grantInfo) {
      const tabMetadata: Record<
        string,
        {
          title: string;
          description: string;
        }
      > = {
        overview: {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant overview`,
          description:
            `${grantInfo?.description?.slice(0, 160)}${
              grantInfo?.description && grantInfo?.description?.length >= 160
                ? "..."
                : ""
            }` || "",
        },

        "milestones-and-updates": {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant milestones and updates`,
          description: `View all milestones and updates by ${
            projectInfo?.title || projectInfo?.uid
          } for ${grantInfo?.title} grant.`,
        },

        "impact-criteria": {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant impact criteria`,
          description: `Impact criteria defined by ${
            projectInfo?.title || projectInfo?.uid
          } for ${grantInfo?.title} grant.`,
        },

        reviews: {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant community reviews`,
          description: `View all community reviews of ${
            projectInfo?.title || projectInfo?.uid
          }'s ${grantInfo?.title} grant.`,
        },

        "review-this-grant": {
          title: `Karma GAP - ${projectInfo?.title || projectInfo?.uid} - ${
            grantInfo?.title
          } grant`,
          description: `As a community contributor, you can review ${
            projectInfo?.title || projectInfo?.uid
          }'s ${grantInfo?.title} grant now!`,
        },
      };

      metadata = {
        ...metadata,
        title:
          tabMetadata[tab || "overview"]?.title ||
          tabMetadata["overview"]?.title ||
          "",
        description:
          tabMetadata[tab || "overview"]?.description ||
          tabMetadata["overview"]?.description ||
          "",
      };
    }
  } else {
    metadata = {
      ...metadata,
      title: `Karma GAP - ${projectInfo?.title}`,
      description: projectInfo?.description?.substring(0, 80) || "",
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

const Page = () => {
  return <ProjectGrantsPage />;
};

export default Page;
