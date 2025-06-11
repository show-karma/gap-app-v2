import React from "react";
import { Metadata } from "next";
import { ImpactComponent } from "@/components/Pages/Project/Impact";
import { createMetadataFromContext } from "@/utilities/metadata/projectMetadata";

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}): Promise<Metadata> {
  const projectId = params.projectId;

  // Return basic metadata - parent layout provides the SEO data
  return createMetadataFromContext(null, projectId, 'impact');
}

export default function Page() {
  return <ImpactComponent />;
}
