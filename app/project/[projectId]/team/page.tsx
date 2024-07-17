import React from "react";
import { Hex } from "viem";
import { Metadata } from "next";
import { IProjectDetails } from "@show-karma/karma-gap-sdk/core/class/types/attestations";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}): Promise<Metadata> {
  const projectId = params.projectId;

  const projectInfo = await getMetadata<IProjectDetails>(
    "projects",
    projectId as Hex
  );

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    return {
      title: "Not Found",
      description: "Project not found",
    };
  }

  return {
    title: `Karma GAP - ${projectInfo.title}`,
    description: projectInfo.description?.substring(0, 80) || "",
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: `Karma GAP - ${projectInfo.title}`,
      description: projectInfo.description?.substring(0, 80) || "",
      images: defaultMetadata.openGraph.images.map((image) => ({
        url: image,
        alt: `Karma GAP - ${projectInfo.title}`,
      })),
    },
    icons: {
      icon: "/images/favicon.png",
    },
  };
}

const TeamPage = async ({ params }: { params: { projectId: string } }) => {
  const projectId = params.projectId;

  const projectInfo = await getMetadata<IProjectDetails>(
    "projects",
    projectId as Hex
  );

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    return {
      redirect: {
        permanent: false,
        destination: `/project/${projectId}`,
      },
    };
  }

  return <div />;
  // return (
  //   <div className="pt-5 pb-20">
  //     <div className="font-semibold text-black dark:text-white">Built By</div>
  //     {projectInfo?.members.map((member) => (
  //       <div key={member.uid} className="mt-3 group block flex-shrink-0">
  //         <div className="flex items-center">
  //           <div>
  //             <img
  //               src={member.details?.name || member.recipient}
  //               alt={member.details?.name || member.recipient}
  //               className="inline-block h-9 w-9 rounded-full"
  //             />
  //           </div>
  //           <div className="ml-3">
  //             <p className="text-sm font-medium text-gray-700 dark:text-gray-400 ">
  //               {member.details?.name || member.recipient}
  //             </p>
  //             <p className="text-xs font-medium text-gray-500 dark:text-gray-300 ">
  //               {shortAddress(member.details?.name || member.recipient)}
  //             </p>
  //           </div>
  //         </div>
  //       </div>
  //     ))}
  //   </div>
  // );
};

export default TeamPage;
