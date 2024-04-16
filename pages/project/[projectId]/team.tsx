// /* eslint-disable @next/next/no-img-element */
import React from "react";
// import { ProjectPageLayout } from ".";
// import { blo } from "blo";
// import { useProjectStore } from "@/store";
import { Hex } from "viem";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { IProjectDetails } from "@show-karma/karma-gap-sdk";
// import { NextSeo } from "next-seo";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
// import { defaultMetadata } from "@/utilities/meta";
// import { shortAddress } from "@/utilities/shortAddress";

import { useRouter } from "next/router";
import { useEffect } from "react";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { params } = context;
  const projectId = params?.projectId as string;

  const projectInfo = await getMetadata<IProjectDetails>(
    "projects",
    projectId as Hex
  );

  // if (projectInfo?.uid === zeroUID || !projectInfo) {
  return {
    redirect: {
      permanent: false,
      destination: `/project/${projectId}`,
    },
  };
  // }
  // return {
  //   props: {
  //     projectTitle: projectInfo?.title || "",
  //     projectDesc: projectInfo?.description?.substring(0, 80) || "",
  //   },
  // };
}
// const TeamPage = ({
//   projectTitle,
//   projectDesc,
// }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
//   const dynamicMetadata = {
//     title: `Karma GAP - ${projectTitle}`,
//     description: projectDesc,
//   };
//   const project = useProjectStore((state) => state.project);
//   return (
//     <>
//       <NextSeo
//         title={dynamicMetadata.title || defaultMetadata.title}
//         description={dynamicMetadata.description || defaultMetadata.description}
//         twitter={{
//           handle: defaultMetadata.twitter.creator,
//           site: defaultMetadata.twitter.site,
//           cardType: "summary_large_image",
//         }}
//         openGraph={{
//           url: defaultMetadata.openGraph.url,
//           title: dynamicMetadata.title || defaultMetadata.title,
//           description:
//             dynamicMetadata.description || defaultMetadata.description,
//           images: defaultMetadata.openGraph.images.map((image) => ({
//             url: image,
//             alt: dynamicMetadata.title || defaultMetadata.title,
//           })),
//           site_name: defaultMetadata.openGraph.siteName,
//         }}
//         additionalLinkTags={[
//           {
//             rel: "icon",
//             href: "/images/favicon.png",
//           },
//         ]}
//       />
//       <div className="pt-5 pb-20">
//         <div className="font-semibold text-black dark:text-white">Built By</div>
//         {project?.members.map((member) => (
//           <div key={member.uid} className="mt-3 group block flex-shrink-0">
//             <div className="flex items-center">
//               <div>
//                 <img
//                   src={blo((member.details?.name as Hex) || member.recipient)}
//                   alt={member.details?.name || member.recipient}
//                   className="inline-block h-9 w-9 rounded-full"
//                 />
//               </div>
//               <div className="ml-3">
//                 <p className="text-sm font-medium text-gray-700 dark:text-gray-400 ">
//                   {member.details?.name || member.recipient}
//                 </p>
//                 <p className="text-xs font-medium text-gray-500 dark:text-gray-300 ">
//                   {shortAddress(member.details?.name || member.recipient)}
//                 </p>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </>
//   );
// };

// TeamPage.getLayout = ProjectPageLayout;

// export default TeamPage;

const Empty = () => {
  // const router = useRouter();

  // useEffect(() => {
  //   if (router) {
  //     const asPath = router.asPath;
  //     const removeTeam = asPath.replace("/team", "");
  //     router.push(removeTeam);
  //   }
  // }, [router]);

  return <div />;
};

export default Empty;
