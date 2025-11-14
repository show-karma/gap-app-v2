import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { toast } from "react-hot-toast"
import { programReviewersService } from "@/services/program-reviewers.service"
import { QUERY_KEYS } from "@/utilities/queryKeys"

/**
 * Comprehensive hook for managing program reviewers
 * Includes query and mutations for add/remove operations
 */
export function useProgramReviewers(programId: string, chainID: number) {
  const queryClient = useQueryClient()

  // Query for fetching program reviewers
  const query = useQuery({
    queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId, chainID),
    queryFn: async () => {
      return programReviewersService.getReviewers(programId, chainID)
    },
    enabled: !!programId && !!chainID,
  })

  // Mutation for adding a program reviewer
  const addMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const validation = programReviewersService.validateReviewerData({
        publicAddress: data.publicAddress,
        name: data.name,
        email: data.email,
        telegram: data.telegram,
      })

      if (!validation.valid) {
        throw new Error(validation.errors.join(", "))
      }

      return programReviewersService.addReviewer(programId, chainID, {
        publicAddress: data.publicAddress,
        name: data.name,
        email: data.email,
        telegram: data.telegram,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId, chainID),
      })
      toast.success("Program reviewer added successfully")
    },
    onError: (error) => {
      console.error("Error adding program reviewer:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to add program reviewer"
      toast.error(errorMessage)
    },
  })

  // Mutation for removing a program reviewer
  const removeMutation = useMutation({
    mutationFn: async (publicAddress: string) => {
      return programReviewersService.removeReviewer(programId, chainID, publicAddress)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REVIEWERS.PROGRAM(programId, chainID),
      })
      toast.success("Program reviewer removed successfully")
    },
    onError: (error) => {
      console.error("Error removing program reviewer:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Failed to remove program reviewer"
      toast.error(errorMessage)
    },
  })

  return useMemo(
    () => ({
      // Query data and state
      data: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      refetch: query.refetch,

      // Add mutation
      addReviewer: addMutation.mutateAsync,
      isAdding: addMutation.isPending,

      // Remove mutation
      removeReviewer: removeMutation.mutateAsync,
      isRemoving: removeMutation.isPending,
    }),
    [query, addMutation, removeMutation]
  )
}
