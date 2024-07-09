/* eslint-disable @next/next/no-img-element */
import React from "react";
import { useOwnerStore, useProjectStore } from "@/store";
import { Hex } from "viem";
import { Metadata } from "next";
import type { IProjectDetails } from "@show-karma/karma-gap-sdk";
import { ContactInfoSubscription } from "@/components/ContactInfoSubscription";
import { Spinner } from "@/components/Utilities/Spinner";
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

const ContactInfoPage = () => {
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
    <div className="pt-5 pb-20">
      {contactInfoLoading || isAuthorizationLoading ? (
        <div className="px-4 py-4 rounded-md border border-transparent dark:bg-zinc-800  dark:border flex flex-col gap-4 items-start">
          <h3 className="text-xl font-bold leading-6 text-gray-900 dark:text-zinc-100">
            Loading contact info...
          </h3>
          <Spinner />
        </div>
      ) : (
        <ContactInfoSubscription
          contactInfo={contactsInfo?.[contactsInfo.length - 1]}
          existingContacts={contactsInfo}
        />
      )}
    </div>
  );
};

export default ContactInfoPage;
