import React from "react";
import { Metadata } from "next";
import ContactInfoPage from "@/components/Pages/Project/ContactInfoPage";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { createMetadataFromContext } from "@/utilities/metadata/projectMetadata";

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

    return createMetadataFromContext(projectInfo, projectId, 'contact');
  } catch (error) {
    console.error('Error generating contact-info page metadata:', error);
    return createMetadataFromContext(null, projectId, 'contact');
  }
}

function Page() {
  return <ContactInfoPage />;
}

export default Page;
