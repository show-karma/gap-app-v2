import React from "react";
import { Metadata } from "next";
import ContactInfoPage from "@/components/Pages/Project/ContactInfoPage";
import { createMetadataFromContext } from "@/utilities/metadata/projectMetadata";

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}): Promise<Metadata> {
  const projectId = params.projectId;

  // Return basic metadata - parent layout provides the SEO data
  return createMetadataFromContext(null, projectId, 'contact');
}

export default function Page() {
  return <ContactInfoPage />;
}
