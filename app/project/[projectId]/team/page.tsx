import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Team } from "@/components/Pages/Project/Team";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { createMetadataFromContext } from "@/utilities/metadata/projectMetadata";
import { zeroUID } from "@/utilities/commons";

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}): Promise<Metadata> {
  const projectId = params.projectId;

  // Use our new optimized API call and metadata generation
  try {
    const projectInfo = await gapIndexerApi
      .projectBySlug(projectId)
      .then((res) => res.data)
      .catch(() => null);

    return createMetadataFromContext(projectInfo, projectId, 'team');
  } catch (error) {
    console.error('Error generating team page metadata:', error);
    return createMetadataFromContext(null, projectId, 'team');
  }
}

const TeamPage = () => {
  // The Team component will get project data from context
  // No need to fetch data here since the layout already provides it via context
  return <Team />;
};

export default TeamPage;
