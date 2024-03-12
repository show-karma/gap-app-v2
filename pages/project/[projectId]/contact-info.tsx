/* eslint-disable @next/next/no-img-element */
import React, { useEffect } from "react";
import { ProjectPageLayout } from ".";
import { blo } from "blo";
import { useOwnerStore, useProjectStore } from "@/store";
import { Hex } from "viem";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import type { IProjectDetails } from "@show-karma/karma-gap-sdk";
import { NextSeo } from "next-seo";
import { ProjectSubscription } from "@/components/ProjectSubscription";
import { Spinner } from "@/components/Utilities/Spinner";
import { getMetadata } from "@/utilities/sdk";
import { zeroUID } from "@/utilities/commons";
import { defaultMetadata } from "@/utilities/meta";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { params } = context;
  const projectId = params?.projectId as string;

  const projectInfo = await getMetadata<IProjectDetails>(
    "projects",
    projectId as Hex
  );

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    return {
      notFound: true,
    };
  }
  return {
    props: {
      projectTitle: projectInfo?.title || "",
      projectDesc: projectInfo?.description?.substring(0, 80) || "",
    },
  };
}
const ContactInfoPage = ({
  projectTitle,
  projectDesc,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const dynamicMetadata = {
    title: `Karma GAP - ${projectTitle}`,
    description: projectDesc,
  };
  const contactsInfo = useProjectStore((state) => state.projectContactsInfo);
  const contactInfoLoading = useProjectStore(
    (state) => state.contactInfoLoading
  );

  const isOwnerLoading = useOwnerStore((state) => state.isOwnerLoading);
  const isProjectOwnerLoading = useProjectStore(
    (state) => state.isProjectOwnerLoading
  );
  const isAuthorizationLoading = isOwnerLoading || isProjectOwnerLoading;

  return (
    <>
      <NextSeo
        title={dynamicMetadata.title || defaultMetadata.title}
        description={dynamicMetadata.description || defaultMetadata.description}
        twitter={{
          handle: defaultMetadata.twitter.creator,
          site: defaultMetadata.twitter.site,
          cardType: "summary_large_image",
        }}
        openGraph={{
          url: defaultMetadata.openGraph.url,
          title: dynamicMetadata.title || defaultMetadata.title,
          description:
            dynamicMetadata.description || defaultMetadata.description,
          images: defaultMetadata.openGraph.images.map((image) => ({
            url: image,
            alt: dynamicMetadata.title || defaultMetadata.title,
          })),
          site_name: defaultMetadata.openGraph.siteName,
        }}
        additionalLinkTags={[
          {
            rel: "icon",
            href: "/images/favicon.png",
          },
        ]}
      />
      <div className="pt-5 pb-20">
        {contactInfoLoading || isAuthorizationLoading ? (
          <div className="px-4 py-4 rounded-md border border-transparent dark:bg-zinc-800  dark:border flex flex-col gap-4 items-start">
            <h3 className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100">
              Loading contact info...
            </h3>
            <Spinner />
          </div>
        ) : (
          <ProjectSubscription
            contactInfo={contactsInfo?.[contactsInfo.length - 1]}
            existingContacts={contactsInfo}
          />
        )}
      </div>
    </>
  );
};

ContactInfoPage.getLayout = ProjectPageLayout;

export default ContactInfoPage;
