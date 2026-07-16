import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { applicationCommentsService } from "@/services/application-comments.service";
import { deleteApplication } from "@/services/funding-applications";
import {
  type FundingProgram,
  fundingApplicationsAPI,
  fundingPlatformService,
  type IApplicationFilters,
} from "@/services/fundingPlatformService";
import type { FundingProgramMetadata } from "@/src/features/funding-map/types/funding-program";
import { ProgramRegistryService } from "@/src/features/program-registry/services/program-registry.service";
import type { ProgramMetadata } from "@/src/features/program-registry/types";
import type {
  ExportFormat,
  FundingApplicationStatusV2,
  IApplicationUpdateRequest,
  IFormSchema,
  IFundingApplication,
  IFundingProgramConfig,
} from "@/types/funding-platform";
import { QUERY_KEYS } from "./fundingPlatformQueryKeys";
import { useAuth } from "./useAuth";

const getApiErrorStatus = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined;

const getApiErrorMessage = (error: unknown, fallback: string): string =>
  (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) || fallback;

/**
 * Hook for managing funding programs for a community
 */
export const useFundingPrograms = (communityId: string) => {
  const queryClient = useQueryClient();

  const programsQuery = useQuery({
    queryKey: QUERY_KEYS.programs(communityId),
    queryFn: () => fundingPlatformService.programs.getProgramsByCommunity(communityId),
    enabled: !!communityId,
  });

  const createProgramConfigurationMutation = useMutation({
    mutationFn: ({
      programId,
      config,
    }: {
      programId: string;
      config: Omit<IFundingProgramConfig, "id" | "createdAt" | "updatedAt">;
    }) => fundingPlatformService.programs.createProgramConfiguration(programId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programs(communityId) });
      toast.success("Program created successfully");
    },
    onError: (error) => {
      console.error("Failed to create program:", error);
      toast.error("Failed to create program");
    },
  });

  return {
    programs: programsQuery.data || [],
    isLoading: programsQuery.isLoading,
    error: programsQuery.error,
    createProgramConfig: createProgramConfigurationMutation.mutate,
    isCreating: createProgramConfigurationMutation.isPending,
    refetch: () => {
      programsQuery.refetch();
    },
  };
};

/**
 * Hook for toggling anyoneCanJoin (open enrollment) on a program.
 * Uses optimistic updates with rollback on failure and invalidates
 * the programs cache on settle.
 */
export const useUpdateProgramEnrollment = (
  programId: string,
  communityId: string,
  program: { metadata: FundingProgramMetadata } | null | undefined
) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (anyoneCanJoin: boolean) => {
      if (!program?.metadata) {
        throw new Error("Program data is not loaded");
      }
      const updatedMetadata = {
        ...program.metadata,
        anyoneCanJoin,
      };
      await ProgramRegistryService.updateProgram(
        programId,
        updatedMetadata as unknown as ProgramMetadata
      );
      return anyoneCanJoin;
    },
    onMutate: async (anyoneCanJoin: boolean) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.programs(communityId) });

      const previous = queryClient.getQueryData<FundingProgram[]>(QUERY_KEYS.programs(communityId));

      if (previous) {
        queryClient.setQueryData<FundingProgram[]>(
          QUERY_KEYS.programs(communityId),
          previous.map((p) =>
            p.programId === programId ? { ...p, metadata: { ...p.metadata, anyoneCanJoin } } : p
          )
        );
      }

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.programs(communityId), context.previous);
      }
      errorManager("Failed to update open enrollment setting", error, {
        programId,
      });
      toast.error("Failed to update enrollment setting. Please try again.");
    },
    onSuccess: (_data, anyoneCanJoin) => {
      toast.success(`Open enrollment ${anyoneCanJoin ? "enabled" : "disabled"}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programs(communityId) });
    },
  });

  return {
    updateEnrollment: mutation.mutate,
    isPending: mutation.isPending,
  };
};

/**
 * Hook for managing a specific program configuration
 */
export const useProgramConfig = (programId: string) => {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: QUERY_KEYS.programConfig(programId),
    queryFn: () => fundingPlatformService.programs.getProgramConfiguration(programId),
    enabled: !!programId,
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: Partial<IFundingProgramConfig | null>) =>
      fundingPlatformService.programs.updateProgramConfiguration(programId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId) });
      toast.success("Program configuration updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update program configuration:", error);
      toast.error("Failed to update program configuration");
    },
  });

  const updateFormSchemaMutation = useMutation({
    mutationFn: (formSchema: IFormSchema) =>
      fundingPlatformService.programs.updateFormSchema(programId, formSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId) });
      toast.success("Form schema updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update form schema:", error);
      toast.error("Failed to update form schema");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      fundingPlatformService.programs.toggleProgramStatus(programId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId) });
      toast.success("Program status updated successfully");
    },
    onError: (error) => {
      console.error("Failed to toggle program status:", error);
      toast.error("Failed to update program status");
    },
  });

  return {
    data: configQuery.data,
    config: configQuery.data?.applicationConfig,
    isLoading: configQuery.isLoading,
    error: configQuery.error,
    updateConfig: updateConfigMutation.mutate,
    updateFormSchema: updateFormSchemaMutation.mutate,
    toggleStatus: toggleStatusMutation.mutate,
    toggleStatusAsync: toggleStatusMutation.mutateAsync,
    isUpdating:
      updateConfigMutation.isPending ||
      updateFormSchemaMutation.isPending ||
      toggleStatusMutation.isPending,
    refetch: () => {
      configQuery.refetch();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programStats(programId) });
    },
  };
};

/**
 * Hook for managing grant applications with infinite scroll
 */
export const useFundingApplications = (programId: string, filters: IApplicationFilters = {}) => {
  const queryClient = useQueryClient();

  // Set default limit to 25 if not provided, exclude page from filters for infinite scroll
  const { page: _page, ...filtersWithoutPage } = filters;
  const filtersWithDefaults = {
    limit: 25,
    ...filtersWithoutPage,
  };
  const { authenticated } = useAuth();

  const applicationsQuery = useInfiniteQuery({
    queryKey: QUERY_KEYS.applications(programId, filtersWithDefaults),
    queryFn: ({ pageParam = 1 }) =>
      fundingPlatformService.applications.getApplicationsByProgram(programId, {
        ...filtersWithDefaults,
        page: pageParam,
      }),
    enabled: !!programId && authenticated,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Scope the statistics to the same reviewer filter as the list, so the counts
  // reflect the selected reviewer(s).
  const reviewerStatsFilter = {
    reviewerAddress: filtersWithDefaults.reviewerAddress,
    reviewerAddresses: filtersWithDefaults.reviewerAddresses,
  };

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.applicationStats(programId, reviewerStatsFilter),
    queryFn: () =>
      fundingPlatformService.applications.getApplicationStatistics(programId, reviewerStatsFilter),
    enabled: !!programId && authenticated,
  });

  const submitApplicationMutation = useMutation({
    mutationFn: (applicationData: Record<string, unknown>) => {
      // Extract email from application data
      let applicantEmail = "";
      const emailFields = Object.keys(applicationData).filter((key) => {
        const value = applicationData[key];
        return (
          key.toLowerCase().includes("email") || (typeof value === "string" && value.includes("@"))
        );
      });
      if (emailFields.length > 0) {
        applicantEmail = String(applicationData[emailFields[0]] ?? "");
      } else {
        throw new Error("Email field is required in the application form");
      }

      return fundingPlatformService.applications.submitApplication({
        programId,
        applicantEmail,
        applicationData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.applications(programId, { limit: 25 }),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applicationStats(programId) });
      toast.success("Application submitted successfully!");
    },
    onError: (error) => {
      console.error("Failed to submit application:", error);
      toast.error("Failed to submit application. Please try again.");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      applicationId,
      status,
      note,
      approvedAmount,
      approvedCurrency,
    }: {
      applicationId: string;
      status: string;
      note?: string;
      approvedAmount?: string;
      approvedCurrency?: string;
    }) =>
      fundingPlatformService.applications.updateApplicationStatus(applicationId, {
        status: status as FundingApplicationStatusV2,
        reason: note || "",
        approvedAmount,
        approvedCurrency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.applications(programId, { limit: 25 }),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applicationStats(programId) });
    },
    onError: (error) => {
      console.error("Failed to update application status:", error);
      toast.error("Failed to update application status");
    },
  });

  // Flatten the paginated data
  const applications = applicationsQuery.data?.pages.flatMap((page) => page.applications) || [];
  const firstPage = applicationsQuery.data?.pages[0];

  return {
    applications,
    total: firstPage?.pagination?.total || 0,
    page: firstPage?.pagination?.page || 1,
    totalPages: firstPage?.pagination?.totalPages || 1,
    stats: statsQuery.data,
    isLoading: applicationsQuery.isLoading || statsQuery.isLoading,
    isFetchingNextPage: applicationsQuery.isFetchingNextPage,
    hasNextPage: applicationsQuery.hasNextPage,
    fetchNextPage: applicationsQuery.fetchNextPage,
    error: applicationsQuery.error, // Only show error if applications query fails, stats are optional
    statsError: statsQuery.error, // Separate error for stats (non-blocking)
    submitApplication: submitApplicationMutation.mutate,
    updateApplicationStatus: updateStatusMutation.mutateAsync,
    isSubmitting: submitApplicationMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    refetch: () => {
      applicationsQuery.refetch();
      statsQuery.refetch();
    },
  };
};

/**
 * Hook for managing a single application
 */
export const useFundingApplication = (applicationId: string) => {
  const queryClient = useQueryClient();

  const applicationQuery = useQuery({
    queryKey: QUERY_KEYS.application(applicationId),
    queryFn: () => fundingPlatformService.applications.getApplication(applicationId),
    enabled: !!applicationId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      status,
      note,
      approvedAmount,
      approvedCurrency,
    }: {
      status: string;
      note?: string;
      approvedAmount?: string;
      approvedCurrency?: string;
    }) =>
      fundingPlatformService.applications.updateApplicationStatus(applicationId, {
        status: status as FundingApplicationStatusV2,
        reason: note || "",
        approvedAmount,
        approvedCurrency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.application(applicationId) });
    },
    onError: (error) => {
      console.error("Failed to update application status:", error);
      toast.error("Failed to update application status");
    },
  });

  return {
    application: applicationQuery.data,
    isLoading: applicationQuery.isLoading,
    error: applicationQuery.error,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    refetch: applicationQuery.refetch,
  };
};

/**
 * Hook for application updates (for users updating their applications)
 */
export const useApplicationUpdateV2 = () => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({
      applicationId,
      ...request
    }: { applicationId: string } & IApplicationUpdateRequest) =>
      fundingPlatformService.applications.updateApplication(applicationId, request),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.application(variables.applicationId),
      });

      // Show appropriate message based on status change
      if (
        data.status === "pending" &&
        data.statusHistory?.some((h) => h.status === "revision_requested")
      ) {
        toast.success("Application resubmitted for review");
      } else {
        toast.success("Application updated successfully");
      }
    },
    onError: (error) => {
      console.error("Failed to update application:", error);

      const status = getApiErrorStatus(error);
      if (status === 403) {
        toast.error(
          getApiErrorMessage(error, "You do not have permission to edit this application")
        );
      } else if (status === 400) {
        toast.error(getApiErrorMessage(error, "Validation error. Please check your input."));
      } else {
        toast.error(getApiErrorMessage(error, "Failed to update application"));
      }
    },
  });

  return {
    updateApplication: updateMutation.mutate,
    updateApplicationAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    error: updateMutation.error,
  };
};

/**
 * Hook for updating post-approval form data (Admin/Staff only after initial submission)
 * Owners can submit once, admins/staff can edit multiple times with audit trail tracking
 */
export const usePostApprovalUpdate = () => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({
      applicationId,
      postApprovalData,
    }: {
      applicationId: string;
      postApprovalData: Record<string, unknown>;
    }) =>
      fundingPlatformService.applications.updatePostApprovalData(applicationId, postApprovalData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.application(variables.applicationId),
      });
      toast.success("Post-approval data updated successfully");
    },
    onError: (error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to update post-approval data:", error);
      }

      const status = getApiErrorStatus(error);
      if (status === 403) {
        toast.error(
          getApiErrorMessage(error, "You do not have permission to edit post-approval data")
        );
      } else if (status === 400) {
        toast.error(getApiErrorMessage(error, "Validation error. Please check your input."));
      } else {
        toast.error(getApiErrorMessage(error, "Failed to update post-approval data"));
      }
    },
  });

  return {
    updatePostApprovalData: updateMutation.mutate,
    updatePostApprovalDataAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    error: updateMutation.error,
  };
};

/**
 * Hook for exporting applications with V2 format support
 */
export const useApplicationExport = (programId: string, isAdmin: boolean = false) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportApplications = useCallback(
    async (format: ExportFormat = "csv", filters: IApplicationFilters = {}) => {
      setIsExporting(true);
      try {
        const response = isAdmin
          ? await fundingPlatformService.applications.exportApplicationsAdmin(
              programId,
              format,
              filters
            )
          : await fundingPlatformService.applications.exportApplications(
              programId,
              format,
              filters
            );

        // Extract data and filename from response
        const { data, filename } = response;

        // Handle blob response for CSV
        let blob: Blob;
        if (format === "csv" && data instanceof Blob) {
          blob = data;
        } else if (format === "csv") {
          blob = new Blob([data as BlobPart], { type: "text/csv" });
        } else {
          blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        }

        // Download file
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // Use filename from server if available, otherwise generate one
        if (filename) {
          link.download = filename;
        } else {
          const filePrefix = isAdmin ? "admin-applications" : "applications";
          link.download = `${filePrefix}-${programId}-${new Date().toISOString().split("T")[0]}.${format}`;
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(`Applications exported as ${format.toUpperCase()}`);
      } catch (error) {
        console.error("Failed to export applications:", error);
        toast.error("Failed to export applications");
      } finally {
        setIsExporting(false);
      }
    },
    [programId, isAdmin]
  );

  return {
    exportApplications,
    isExporting,
  };
};

/**
 * Hook for fetching a single application with prefetch support
 */
export const useApplication = (applicationId: string | null) => {
  const queryClient = useQueryClient();
  const { authenticated } = useAuth();

  const applicationQuery = useQuery({
    queryKey: QUERY_KEYS.application(applicationId!),
    queryFn: () => fundingApplicationsAPI.getApplication(applicationId!),
    enabled: !!applicationId && authenticated,
  });

  const prefetchApplication = useCallback(
    (applicationId: string) => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.application(applicationId),
        queryFn: () => fundingApplicationsAPI.getApplication(applicationId),
      });
    },
    [queryClient]
  );

  const setApplicationData = useCallback(
    (applicationId: string, data: IFundingApplication) => {
      queryClient.setQueryData(QUERY_KEYS.application(applicationId), data);
    },
    [queryClient]
  );

  return {
    application: applicationQuery.data,
    isLoading: applicationQuery.isLoading,
    error: applicationQuery.error,
    refetch: applicationQuery.refetch,
    prefetchApplication,
    setApplicationData,
  };
};

/**
 * Hook for managing application status updates
 */
export const useApplicationStatus = (programId?: string, _chainId?: number) => {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({
      applicationId,
      status,
      note,
      approvedAmount,
      approvedCurrency,
    }: {
      applicationId: string;
      status: string;
      note?: string;
      approvedAmount?: string;
      approvedCurrency?: string;
    }) =>
      fundingApplicationsAPI.updateApplicationStatus(applicationId, {
        status: status as FundingApplicationStatusV2,
        reason: note || "",
        approvedAmount,
        approvedCurrency,
      }),
    onSuccess: (_, variables) => {
      // Invalidate and refetch application data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.application(variables.applicationId) });

      // Invalidate applications list if programId is provided
      if (programId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.applications(programId, { limit: 25 }),
        });
      }

      // Invalidate all applications lists
      queryClient.invalidateQueries({ queryKey: ["funding-applications"] });

      // Refresh the cross-program Reviewer Inbox feed + header stats. Uses the
      // `["reviewer-inbox"]` prefix so every community/filter variant refetches.
      // No-op when the inbox isn't mounted (e.g. the per-program "My
      // Applications" page), so it doesn't change that surface's behavior.
      queryClient.invalidateQueries({ queryKey: ["reviewer-inbox"] });
    },
    onError: (error) => {
      const errorMessage = getApiErrorMessage(error, "Failed to update application status");
      toast.error(errorMessage);
      console.error("Failed to update application status:", error);
    },
  });

  return {
    updateStatus: statusMutation.mutate,
    updateStatusAsync: statusMutation.mutateAsync,
    isUpdating: statusMutation.isPending,
    error: statusMutation.error,
  };
};

/**
 * Hook for managing application comments with React Query
 */
export const useApplicationComments = (applicationId: string | null, _isAdmin: boolean = false) => {
  const queryClient = useQueryClient();
  const { authenticated } = useAuth();

  // Query for fetching comments
  const commentsQuery = useQuery({
    queryKey: QUERY_KEYS.applicationComments(applicationId!),
    queryFn: () => applicationCommentsService.getComments(applicationId!),
    enabled: !!applicationId && authenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 1, // 5 minutes
  });

  // Mutation for creating comments
  const createCommentMutation = useMutation({
    mutationFn: ({ content }: { content: string }) =>
      applicationCommentsService.createComment(applicationId!, content),
    onSuccess: () => {
      // Invalidate and refetch comments after successful creation
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.applicationComments(applicationId!),
      });
      toast.success("Comment added successfully");
    },
    onError: (error) => {
      const errorMessage = getApiErrorMessage(error, "Failed to add comment");
      toast.error(errorMessage);
      errorManager(errorMessage, error);
      console.error("Failed to add comment:", error);
    },
  });

  // Mutation for editing comments
  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      applicationCommentsService.editComment(commentId, content),
    onSuccess: () => {
      // Invalidate and refetch comments after successful edit
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.applicationComments(applicationId!),
      });
      toast.success("Comment updated successfully");
    },
    onError: (error) => {
      const errorMessage = getApiErrorMessage(error, "Failed to edit comment");
      toast.error(errorMessage);
      console.error("Failed to edit comment:", error);
    },
  });

  // Mutation for deleting comments
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => applicationCommentsService.deleteComment(commentId),
    onSuccess: () => {
      // Refetch comments after deletion
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.applicationComments(applicationId!),
      });
      toast.success("Comment deleted successfully");
    },
    onError: (error) => {
      const errorMessage = getApiErrorMessage(error, "Failed to delete comment");
      toast.error(errorMessage);
      console.error("Failed to delete comment:", error);
    },
  });

  return {
    comments: commentsQuery.data || [],
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error,
    refetch: commentsQuery.refetch,

    createComment: createCommentMutation.mutate,
    createCommentAsync: createCommentMutation.mutateAsync,
    isCreatingComment: createCommentMutation.isPending,

    editComment: editCommentMutation.mutate,
    editCommentAsync: editCommentMutation.mutateAsync,
    isEditingComment: editCommentMutation.isPending,

    deleteComment: deleteCommentMutation.mutate,
    deleteCommentAsync: deleteCommentMutation.mutateAsync,
    isDeletingComment: deleteCommentMutation.isPending,
  };
};

/**
 * Hook for managing application versions with React Query
 */
export const useApplicationVersions = (applicationIdOrReference: string | null) => {
  const queryClient = useQueryClient();
  const { authenticated } = useAuth();

  // Query for fetching application versions
  const versionsQuery = useQuery({
    queryKey: QUERY_KEYS.applicationVersions(applicationIdOrReference!),
    queryFn: () => fundingApplicationsAPI.getApplicationVersions(applicationIdOrReference!),
    enabled: !!applicationIdOrReference && authenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    select: (data) => {
      // Sort versions by version number descending (newest first).
      // Copy first: sorting in place would mutate the cached array.
      return [...data].sort((a, b) => b.versionNumber - a.versionNumber);
    },
  });

  // Helper to get reference number
  const getReferenceNumber = useCallback(async () => {
    if (!applicationIdOrReference) return null;

    // If it's already a reference number, return it
    if (applicationIdOrReference.startsWith("APP-")) {
      return applicationIdOrReference;
    }

    // Otherwise, fetch the application to get the reference number
    try {
      const application = await fundingApplicationsAPI.getApplication(applicationIdOrReference);
      return application.referenceNumber;
    } catch (error) {
      console.error("Failed to get reference number:", error);
      return null;
    }
  }, [applicationIdOrReference]);

  // Prefetch versions
  const prefetchVersions = useCallback(
    (applicationIdOrReference: string) => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.applicationVersions(applicationIdOrReference),
        queryFn: () => fundingApplicationsAPI.getApplicationVersions(applicationIdOrReference),
      });
    },
    [queryClient]
  );

  // Invalidate versions cache
  const invalidateVersions = useCallback(() => {
    if (applicationIdOrReference) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.applicationVersions(applicationIdOrReference),
      });
    }
  }, [queryClient, applicationIdOrReference]);

  return {
    versions: versionsQuery.data || [],
    isLoading: versionsQuery.isLoading,
    error: versionsQuery.error,
    refetch: versionsQuery.refetch,
    getReferenceNumber,
    prefetchVersions,
    invalidateVersions,
  };
};

/**
 * Hook for deleting an application (Admin only)
 */
export const useDeleteApplication = () => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (referenceNumber: string) => deleteApplication(referenceNumber),
    onSuccess: (_data, _referenceNumber) => {
      // Invalidate all application-related queries
      queryClient.invalidateQueries({
        queryKey: ["funding-application"],
      });
      queryClient.invalidateQueries({
        queryKey: ["applications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["application-stats"],
      });
      toast.success("Application deleted successfully");
    },
    onError: (error, referenceNumber: string) => {
      // Determine specific error message based on status code
      let userMessage: string;
      const axiosError = isAxiosError<{ message?: string }>(error) ? error : undefined;
      const statusCode = axiosError?.response?.status;

      if (statusCode === 401 || statusCode === 403) {
        userMessage =
          "You do not have permission to delete this application. Only community admins can delete applications.";
      } else if (statusCode === 404) {
        userMessage = "Application not found. It may have already been deleted.";
      } else if (statusCode === 500 || (statusCode && statusCode >= 500)) {
        userMessage =
          "Server error occurred while deleting the application. Please try again or contact support.";
      } else if (!statusCode || axiosError?.code === "ERR_NETWORK") {
        userMessage = "Network error. Please check your connection and try again.";
      } else {
        // Fallback for other errors
        userMessage =
          axiosError?.response?.data?.message || "Failed to delete application. Please try again.";
      }

      // Use errorManager for comprehensive error handling with Sentry
      errorManager(
        "Failed to delete application",
        error,
        {
          referenceNumber,
          statusCode,
          operation: "delete-application",
          errorResponse: axiosError?.response?.data,
        },
        {
          error: userMessage,
        }
      );
    },
  });

  return {
    deleteApplication: deleteMutation.mutate,
    deleteApplicationAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    error: deleteMutation.error,
  };
};
