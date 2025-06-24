/* eslint-disable @next/next/no-img-element */
import { ProjectWrapper } from "@/components/Pages/Project/ProjectWrapper";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata";
import { getProjectData } from "@/utilities/queries/getProjectData";
import { Metadata } from "next";

type Params = Promise<{
  projectId: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const { projectId } = awaitedParams;

  const projectInfo = await getProjectData(projectId);

  return generateProjectOverviewMetadata(projectInfo, projectId);
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const awaitedParams = await props.params;
  const { projectId } = awaitedParams;

  const { children } = props;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      return await getProjectData(projectId);
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-0">
        <ProjectWrapper projectId={projectId} />
        <div className="px-4 sm:px-6 lg:px-12">{children}</div>
      </div>
    </HydrationBoundary>
  );
}
