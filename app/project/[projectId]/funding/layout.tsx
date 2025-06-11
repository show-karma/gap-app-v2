import { GrantsLayout } from "@/components/Pages/Project/Grants/Layout";
import { Suspense } from "react";
import { Metadata } from "next";
import { ProjectGrantsLayoutLoading } from "@/components/Pages/Project/Loading/Grants/Layout";
import { createMetadataFromContext } from "@/utilities/metadata/projectMetadata";

export async function generateMetadata({
  params,
}: {
  params: {
    projectId: string;
  };
}): Promise<Metadata> {
  const projectId = params?.projectId as string;

  // Return basic metadata - parent layout provides the SEO data
  return createMetadataFromContext(null, projectId, 'funding');
}

const Page = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<ProjectGrantsLayoutLoading>{children}</ProjectGrantsLayoutLoading>}>
      <GrantsLayout>{children}</GrantsLayout>
    </Suspense>
  );
};

export default Page;
