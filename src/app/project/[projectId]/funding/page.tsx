import { zeroUID } from "@/lib/utils/misc";
import { envVars } from "@/config/env";
import { cleanMarkdownForPlainText } from "@/lib/markdown";
import { defaultMetadata } from "@/lib/metadata/meta";
import { getProjectCachedData } from "@/lib/queries/getProjectCachedData";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectGrantsOverviewLoading } from "@/features/projects/components/loading/Grants/Overview";
import { GrantOverview } from "@/features/projects/components/grants/Overview";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { projectId } = await params;

  const projectInfo = await getProjectCachedData(projectId);

  if (projectInfo?.uid === zeroUID || !projectInfo) {
    notFound();
  }
  const metadata = {
    title: `${projectInfo?.details?.data?.title} Grants | Karma GAP`,
    description: cleanMarkdownForPlainText(
      projectInfo?.details?.data?.description || "",
      80
    ),
    twitter: defaultMetadata.twitter,
    openGraph: defaultMetadata.openGraph,
    icons: defaultMetadata.icons,
  };

  return {
    title: metadata.title,
    description: metadata.description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      card: "summary_large_image",
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title || defaultMetadata.title,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: metadata.title,
      description: metadata.description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`,
          alt: metadata.title || defaultMetadata.title,
        },
      ],
    },
    icons: metadata.icons,
  };
}
const Page = () => {
  return (
    <Suspense fallback={<ProjectGrantsOverviewLoading />}>
      <GrantOverview />
    </Suspense>
  );
};

export default Page;
