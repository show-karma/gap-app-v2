import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CommunityProjectEvaluatorPage } from "@/components/Pages/Communities/CommunityProjectEvaluatorPage"
import { zeroUID } from "@/utilities/commons"
import { envVars } from "@/utilities/enviromentVars"
import fetchData from "@/utilities/fetchData"
import { gapIndexerApi } from "@/utilities/gapIndexerApi"
import { INDEXER } from "@/utilities/indexer"
import { defaultMetadata } from "@/utilities/meta"

type Params = Promise<{
  communityId: string
}>
type SearchParams = Promise<{
  programId: string
}>

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}): Promise<Metadata> {
  const { communityId } = await params
  const { programId } = await searchParams
  let communityName = communityId

  try {
    const { data } = await gapIndexerApi.communityBySlug(communityId)
    communityName = data?.details?.data?.name || communityId
    if (!data || data?.uid === zeroUID || !data?.details?.data?.name) {
      notFound()
    }
  } catch {
    notFound()
  }

  let dynamicMetadata = {
    title: `Karma AI - ${communityName} community grants`,
    description: `Chat with Karma AI assistant to projects in ${communityName}, measure their impact and fund them.`,
  }

  if (programId) {
    const [programsRes, _programsError] = await fetchData(INDEXER.COMMUNITY.PROGRAMS(communityId))
    const program = programsRes?.find((p: Record<string, unknown>) => p.programId === programId)?.metadata?.title
    if (program) {
      dynamicMetadata = {
        ...dynamicMetadata,
        description: `Chat with Karma AI assistant to projects in ${communityName}'s ${program}, measure their impact and fund them.`,
      }
    }
  }

  return {
    title: dynamicMetadata.title || defaultMetadata.title,
    description: dynamicMetadata.description || defaultMetadata.description,
    twitter: {
      creator: defaultMetadata.twitter.creator,
      site: defaultMetadata.twitter.site,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/communities/${communityId}`,
          alt: dynamicMetadata.title || defaultMetadata.title,
        },
      ],
    },
    openGraph: {
      url: defaultMetadata.openGraph.url,
      title: dynamicMetadata.title || defaultMetadata.title,
      description: dynamicMetadata.description || defaultMetadata.description,
      images: [
        {
          url: `${envVars.VERCEL_URL}/api/metadata/communities/${communityId}`,
          alt: dynamicMetadata.title || defaultMetadata.title,
        },
      ],
    },
    // link: [
    //   {
    //     rel: "icon",
    //     href: "/favicon.ico",
    //   },
    // ],
  }
}

export default function ProjectsEvaluatorPage() {
  return (
    <div className="flex flex-col gap-5 h-full">
      <CommunityProjectEvaluatorPage />
    </div>
  )
}
