import { GrantsLayout } from "@/components/Pages/Project/Grants/Layout";
import { Spinner } from "@/components/Utilities/Spinner";
import { Suspense } from "react";
import { ProjectGrantsPage } from "@/components/Pages/Project/ProjectGrantsPage";
/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";

import { Hex } from "viem";
import { Metadata } from "next";

import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";
import {
  IGrantDetails,
  IProjectResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { fetchFromLocalApi } from "@/utilities/fetchFromServer";

// export async function generateMetadata({
//   params,
//   searchParams,
// }: {
//   params: {
//     projectId: string;
//   };
//   searchParams: {
//     grantId: string;
//     tab: string;
//   };
// }): Promise<Metadata> {
//   const projectId = params?.projectId as string;
//   const grant = searchParams?.grantId as string | undefined;
//   const tab = searchParams?.tab as string | undefined;

//   const projectInfo = await fetchFromLocalApi<IProjectResponse>(
//     `/metadata?type=project&uid=${projectId}`
//   );

//   if (projectInfo?.uid === zeroUID || !projectInfo) {
//     notFound();
//   }
//   let metadata = {
//     title: defaultMetadata.title,
//     description: defaultMetadata.description,
//     twitter: defaultMetadata.twitter,
//     openGraph: defaultMetadata.openGraph,
//     icons: defaultMetadata.icons,
//   };
//   if (grant && tab) {
//     const grantInfo = await fetchFromLocalApi<IGrantDetails>(
//       `/metadata?type=grant&uid=${grant}`
//     );
//     if (grantInfo) {
//       const tabMetadata: Record<
//         string,
//         {
//           title: string;
//           description: string;
//         }
//       > = {
//         overview: {
//           title: `Karma GAP - ${projectInfo?.details?.data?.title} - ${grantInfo?.data.title} grant overview`,
//           description:
//             `${grantInfo?.data.description?.slice(0, 160)}${
//               grantInfo?.data.description &&
//               grantInfo?.data.description?.length >= 160
//                 ? "..."
//                 : ""
//             }` || "",
//         },

//         "milestones-and-updates": {
//           title: `Karma GAP - ${projectInfo?.details?.data?.title} - ${grantInfo?.data.title} grant milestones and updates`,
//           description: `View all milestones and updates by ${projectInfo?.details?.data?.title} for ${grantInfo?.data.title} grant.`,
//         },

//         "impact-criteria": {
//           title: `Karma GAP - ${projectInfo?.details?.data?.title} - ${grantInfo?.data.title} grant impact criteria`,
//           description: `Impact criteria defined by ${projectInfo?.details?.data?.title} for ${grantInfo?.data.title} grant.`,
//         },

//         reviews: {
//           title: `Karma GAP - ${projectInfo?.details?.data?.title} - ${grantInfo?.data.title} grant community reviews`,
//           description: `View all community reviews of ${projectInfo?.details?.data?.title}'s ${grantInfo?.data.title} grant.`,
//         },

//         "review-this-grant": {
//           title: `Karma GAP - ${projectInfo?.details?.data?.title} - ${grantInfo?.data.title} grant`,
//           description: `As a community contributor, you can review ${projectInfo?.details?.data?.title}'s ${grantInfo?.data.title} grant now!`,
//         },
//       };

//       metadata = {
//         ...metadata,
//         title:
//           tabMetadata[tab || "overview"]?.title ||
//           tabMetadata["overview"]?.title ||
//           "",
//         description:
//           tabMetadata[tab || "overview"]?.description ||
//           tabMetadata["overview"]?.description ||
//           "",
//       };
//     }
//   } else {
//     metadata = {
//       ...metadata,
//       title: `Karma GAP - ${projectInfo?.details?.data?.title}`,
//       description:
//         projectInfo?.details?.data?.description?.substring(0, 80) || "",
//     };
//   }

//   return {
//     title: metadata.title,
//     description: metadata.description,
//     twitter: {
//       creator: defaultMetadata.twitter.creator,
//       site: defaultMetadata.twitter.site,
//       card: "summary_large_image",
//     },
//     openGraph: {
//       url: defaultMetadata.openGraph.url,
//       title: metadata.title,
//       description: metadata.description,
//       images: defaultMetadata.openGraph.images.map((image) => ({
//         url: image,
//         alt: metadata.title,
//       })),
//       // site_name: defaultMetadata.openGraph.siteName,
//     },
//     icons: metadata.icons,
//   };
// }

export default async function RootLayout({
  children,
  params: { projectId },
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col w-full h-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <div className="w-full h-full">
        <GrantsLayout>{children}</GrantsLayout>
      </div>
    </Suspense>
  );
}
