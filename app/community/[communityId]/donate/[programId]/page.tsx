import { CommunityGrantsDonate } from "@/components/CommunityGrantsDonate"
import { pagesOnRoot } from "@/utilities/pagesOnRoot"
import { getCommunityProjectsV2 } from "@/utilities/queries/getCommunityDataV2"

type Props = {
  params: Promise<{
    communityId: string
    programId: string
  }>
}

export default async function Page(props: Props) {
  const { communityId, programId } = await props.params

  if (pagesOnRoot.includes(communityId)) {
    return undefined
  }

  const initialProjects = await getCommunityProjectsV2(communityId, {
    page: 1,
    limit: 12,
    selectedProgramId: programId,
  })

  return (
    <div className="flex flex-col w-full max-w-full sm:px-3 md:px-4 px-6 py-2">
      <CommunityGrantsDonate initialProjects={initialProjects} />
    </div>
  )
}
