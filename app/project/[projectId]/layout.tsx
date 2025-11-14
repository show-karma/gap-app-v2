/* eslint-disable @next/next/no-img-element */

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import type { Metadata } from "next"
import { ProjectWrapper } from "@/components/Pages/Project/ProjectWrapper"
import { layoutTheme } from "@/src/helper/theme"
import { generateProjectOverviewMetadata } from "@/utilities/metadata/projectMetadata"
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions"
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData"

type Params = Promise<{
  projectId: string
}>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const awaitedParams = await params
  const { projectId } = awaitedParams

  const projectInfo = await getProjectCachedData(projectId)

  return generateProjectOverviewMetadata(projectInfo, projectId)
}

export default async function RootLayout(props: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const awaitedParams = await props.params
  const { projectId } = awaitedParams

  const { children } = props

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: defaultQueryOptions,
    },
  })

  await queryClient.prefetchQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      return await getProjectCachedData(projectId)
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-0">
        <ProjectWrapper projectId={projectId} />
        <div className={layoutTheme.padding}>{children}</div>
      </div>
    </HydrationBoundary>
  )
}
