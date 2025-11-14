import { useQuery } from "@tanstack/react-query"
import { checkForDuplicateGrant } from "@/services/duplicateGrantCheck"
import { useProjectStore } from "@/store"
import { QUERY_KEYS } from "@/utilities/queryKeys"

interface DuplicateCheckParams {
  programId?: string
  community: string
  title: string
}

interface UseDuplicateGrantCheckOptions {
  enabled?: boolean
}

export const useDuplicateGrantCheck = (
  params: DuplicateCheckParams,
  options: UseDuplicateGrantCheckOptions = {}
) => {
  const selectedProject = useProjectStore((state) => state.project)
  const { enabled = true } = options

  const queryKey = QUERY_KEYS.GRANTS.DUPLICATE_CHECK({
    projectUid: selectedProject?.uid,
    programId: params.programId,
    community: params.community,
    title: params.title,
  })

  const {
    data: isGrantDuplicateInProject = false,
    isLoading: isCheckingGrantDuplicate,
    refetch: checkForDuplicateGrantInProject,
  } = useQuery({
    queryKey,
    queryFn: () =>
      checkForDuplicateGrant({
        projectUid: selectedProject?.uid,
        programId: params.programId,
        community: params.community,
        title: params.title,
      }),
    enabled:
      enabled &&
      !!selectedProject?.uid &&
      !!params.community &&
      (!!params.programId || !!params.title),
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache results
  })

  return {
    checkForDuplicateGrantInProject,
    isCheckingGrantDuplicate,
    isGrantDuplicateInProject,
  }
}
