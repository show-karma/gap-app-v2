import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { fundingPlatformService, IApplicationFilters, fundingApplicationsAPI } from '@/services/fundingPlatformService';
import { applicationCommentsService } from '@/services/application-comments.service';
import { 
  IFormSchema, 
  IFundingApplication, 
  IFundingProgramConfig,
  IApplicationSubmitRequest,
  IApplicationUpdateRequest,
  IApplicationStatusUpdateRequest,
  FundingApplicationStatusV2,
  ExportFormat,
  ApplicationComment
} from '@/types/funding-platform';
import toast from 'react-hot-toast';
import { errorManager } from '@/components/Utilities/errorManager';
import { useAuth } from './useAuth';

// Query keys for caching
const QUERY_KEYS = {
  programs: (communityId: string) => ['grant-programs', communityId],
  programConfig: (programId: string, chainId: number) => ['program-config', programId, chainId],
  programStats: (programId: string, chainId: number) => ['program-stats', programId, chainId],
  applications: (programId: string, chainId: number, filters: IApplicationFilters) => 
    ['applications', programId, chainId, filters],
  application: (applicationId: string) => ['funding-application', applicationId],
  applicationByReference: (referenceNumber: string) => ['application-by-reference', referenceNumber],
  applicationByEmail: (programId: string, chainId: number, email: string) => 
    ['application-by-email', programId, chainId, email],
  applicationStats: (programId: string, chainId: number) => ['application-stats', programId, chainId],
  applicationComments: (applicationId: string, isAdmin?: boolean) => 
    ['application-comments', applicationId, isAdmin],
  applicationVersions: (applicationIdOrReference: string) => 
    ['application-versions', applicationIdOrReference],
};

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
    mutationFn: ({programId, chainId, config}: {programId: string, chainId: number, config: Omit<IFundingProgramConfig, 'id' | 'createdAt' | 'updatedAt'>}) =>
      fundingPlatformService.programs.createProgramConfiguration(programId, chainId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programs(communityId) });
      toast.success('Program created successfully');
    },
    onError: (error) => {
      console.error('Failed to create program:', error);
      toast.error('Failed to create program');
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
 * Hook for managing a specific program configuration
 */
export const useProgramStats = (programId: string, chainId: number) => {

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.programStats(programId, chainId),
    queryFn: () => fundingPlatformService.programs.getProgramStats(programId, chainId),
    enabled: !!programId && !!chainId,
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    error: statsQuery.error,
    refetch: () => {
      statsQuery.refetch();
    },
  };
};


/**
 * Hook for managing a specific program configuration
 */
export const useProgramConfig = (programId: string, chainId: number) => {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: QUERY_KEYS.programConfig(programId, chainId),
    queryFn: () => fundingPlatformService.programs.getProgramConfiguration(programId, chainId),
    enabled: !!programId && !!chainId,
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: Partial<IFundingProgramConfig | null>) =>
      fundingPlatformService.programs.updateProgramConfiguration(programId, chainId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId, chainId) });
      toast.success('Program configuration updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update program configuration:', error);
      toast.error('Failed to update program configuration');
    },
  });

  const updateFormSchemaMutation = useMutation({
    mutationFn: (formSchema: IFormSchema) =>
      fundingPlatformService.programs.updateFormSchema(programId, chainId, formSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId, chainId) });
      toast.success('Form schema updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update form schema:', error);
      toast.error('Failed to update form schema');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      fundingPlatformService.programs.toggleProgramStatus(programId, chainId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId, chainId) });
      toast.success('Program status updated successfully');
    },
    onError: (error) => {
      console.error('Failed to toggle program status:', error);
      toast.error('Failed to update program status');
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
    isUpdating: updateConfigMutation.isPending || updateFormSchemaMutation.isPending || toggleStatusMutation.isPending,
    refetch: () => {
      configQuery.refetch();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programStats(programId, chainId) });
    },
  };
};

/**
 * Hook for managing grant applications with infinite scroll
 */
export const useFundingApplications = (
  programId: string,
  chainId: number,
  filters: IApplicationFilters = {}
) => {
  const queryClient = useQueryClient();

  // Set default limit to 25 if not provided, exclude page from filters for infinite scroll
  const { page, ...filtersWithoutPage } = filters;
  const filtersWithDefaults = {
    limit: 25,
    ...filtersWithoutPage
  };

  const applicationsQuery = useInfiniteQuery({
    queryKey: QUERY_KEYS.applications(programId, chainId, filtersWithDefaults),
    queryFn: ({ pageParam = 1 }) =>
      fundingPlatformService.applications.getApplicationsByProgram(programId, chainId, {
        ...filtersWithDefaults,
        page: pageParam
      }),
    enabled: !!programId && !!chainId,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.applicationStats(programId, chainId),
    queryFn: () => fundingPlatformService.applications.getApplicationStatistics(programId, chainId),
    enabled: !!programId && !!chainId,
  });

  const submitApplicationMutation = useMutation({
    mutationFn: (applicationData: Record<string, any>) => {
      // Extract email from application data
      let applicantEmail = '';
      const emailFields = Object.keys(applicationData).filter(
        (key) =>
          key.toLowerCase().includes('email') ||
          (typeof applicationData[key] === 'string' &&
            applicationData[key].includes('@'))
      );
      if (emailFields.length > 0) {
        applicantEmail = applicationData[emailFields[0]];
      } else {
        throw new Error('Email field is required in the application form');
      }

      return fundingPlatformService.applications.submitApplication({
        programId,
        chainID: chainId,
        applicantEmail,
        applicationData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applications(programId, chainId, { limit: 25 }) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applicationStats(programId, chainId) });
      toast.success('Application submitted successfully!');
    },
    onError: (error) => {
      console.error('Failed to submit application:', error);
      toast.error('Failed to submit application. Please try again.');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, status, note }: { applicationId: string; status: string; note?: string }) =>
      fundingPlatformService.applications.updateApplicationStatus(applicationId, {
        status: status as FundingApplicationStatusV2,
        reason: note || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applications(programId, chainId, { limit: 25 }) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applicationStats(programId, chainId) });
      toast.success('Application status updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update application status:', error);
      toast.error('Failed to update application status');
    },
  });

  // Flatten the paginated data
  const applications = applicationsQuery.data?.pages.flatMap(page => page.applications) || [];
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
    error: applicationsQuery.error || statsQuery.error,
    submitApplication: submitApplicationMutation.mutate,
    updateApplicationStatus: updateStatusMutation.mutate,
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
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      fundingPlatformService.applications.updateApplicationStatus(applicationId, {
        status: status as FundingApplicationStatusV2,
        reason: note || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.application(applicationId) });
      toast.success('Application status updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update application status:', error);
      toast.error('Failed to update application status');
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
 * Hook for form schema management with auto-save
 */
export const useFormSchemaManager = (programId: string, chainId: number) => {
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const { config, updateFormSchema, isUpdating } = useProgramConfig(programId, chainId);

  const saveSchema = useCallback((schema: IFormSchema) => {
    updateFormSchema(schema);
    setIsDirty(false);
    setLastSaved(new Date());
  }, [updateFormSchema]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  return {
    currentSchema: config?.formSchema,
    saveSchema,
    markDirty,
    isDirty,
    lastSaved,
    isSaving: isUpdating,
  };
};

/**
 * Hook for V2 application submission with better error handling
 */
export const useApplicationSubmissionV2 = (programId: string, chainId: number) => {
  const queryClient = useQueryClient();

  // Check if user already has an application
  const checkExistingApplication = useCallback(async (email: string) => {
    try {
      const existing = await fundingPlatformService.applications.getApplicationByEmail(
        programId,
        chainId,
        email
      );
      return existing;
    } catch (error) {
      console.error('Error checking existing application:', error);
      return null;
    }
  }, [programId, chainId]);

  const submitMutation = useMutation({
    mutationFn: async (request: IApplicationSubmitRequest) => {
      // Check for existing application first
      const existing = await checkExistingApplication(request.applicantEmail);
      if (existing) {
        throw new Error('You have already submitted an application for this program');
      }
      
      return fundingPlatformService.applications.submitApplication(request);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.applications(programId, chainId, { limit: 25 })
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.applicationStats(programId, chainId) 
      });
      toast.success(`Application submitted successfully! Reference: ${data.referenceNumber}`);
    },
    onError: (error: any) => {
      console.error('Failed to submit application:', error);
      const message = error.response?.data?.message || error.message || 'Failed to submit application';
      toast.error(message);
    },
  });

  return {
    submitApplication: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
    error: submitMutation.error,
    checkExistingApplication,
  };
};

/**
 * Hook for application updates (for users updating their applications)
 */
export const useApplicationUpdateV2 = () => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ applicationId, ...request }: { applicationId: string } & IApplicationUpdateRequest) =>
      fundingPlatformService.applications.updateApplication(applicationId, request),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.application(variables.applicationId) 
      });
      
      // Show appropriate message based on status change
      if (data.status === 'pending' && data.statusHistory?.some(h => h.status === 'revision_requested')) {
        toast.success('Application resubmitted for review');
      } else {
        toast.success('Application updated successfully');
      }
    },
    onError: (error: any) => {
      console.error('Failed to update application:', error);
      const message = error.response?.data?.message || 'Failed to update application';
      toast.error(message);
    },
  });

  return {
    updateApplication: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    error: updateMutation.error,
  };
};

/**
 * Hook for admin status updates with V2 reason support
 */
export const useApplicationStatusV2 = (applicationId?: string) => {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId: appId, request }: { 
      applicationId: string; 
      request: IApplicationStatusUpdateRequest 
    }) =>
      fundingPlatformService.applications.updateApplicationStatus(
        appId || applicationId!, 
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.application(variables.applicationId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['applications'] // Invalidate all application lists
      });
      
      toast.success(`Application ${variables.request.status.replace('_', ' ')}`);
    },
    onError: (error: any) => {
      console.error('Failed to update application status:', error);
      toast.error('Failed to update application status');
    },
  });

  return {
    updateStatus: (appId: string, status: FundingApplicationStatusV2, reason: string) => 
      updateStatusMutation.mutate({ 
        applicationId: appId, 
        request: { status, reason } 
      }),
    isUpdating: updateStatusMutation.isPending,
    error: updateStatusMutation.error,
  };
};

/**
 * Hook for searching applications by Application ID
 */
export const useApplicationByReference = (referenceNumber: string) => {
  const applicationQuery = useQuery({
    queryKey: QUERY_KEYS.applicationByReference(referenceNumber),
    queryFn: () => fundingPlatformService.applications.getApplicationByReference(referenceNumber),
    enabled: !!referenceNumber && referenceNumber.length > 0,
    retry: false,
  });

  return {
    application: applicationQuery.data,
    isLoading: applicationQuery.isLoading,
    error: applicationQuery.error,
    isNotFound: applicationQuery.error && (applicationQuery.error as any)?.response?.status === 404,
  };
};

/**
 * Hook for exporting applications with V2 format support
 */
export const useApplicationExport = (programId: string, chainId: number, isAdmin: boolean = false) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportApplications = useCallback(async (
    format: ExportFormat = 'csv',
    filters: IApplicationFilters = {}
  ) => {
    setIsExporting(true);
    try {
      const response = isAdmin 
        ? await fundingPlatformService.applications.exportApplicationsAdmin(
            programId,
            chainId,
            format,
            filters
          )
        : await fundingPlatformService.applications.exportApplications(
            programId,
            chainId,
            format,
            filters
          );

      // Extract data and filename from response
      const { data, filename } = response;

      // Handle blob response for CSV
      let blob: Blob;
      if (format === 'csv' && data instanceof Blob) {
        blob = data;
      } else if (format === 'csv') {
        blob = new Blob([data], { type: 'text/csv' });
      } else {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      }

      // Download file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use filename from server if available, otherwise generate one
      if (filename) {
        link.download = filename;
      } else {
        const filePrefix = isAdmin ? 'admin-applications' : 'applications';
        link.download = `${filePrefix}-${programId}-${new Date().toISOString().split('T')[0]}.${format}`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Applications exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export applications:', error);
      toast.error('Failed to export applications');
    } finally {
      setIsExporting(false);
    }
  }, [programId, chainId, isAdmin]);

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

  const prefetchApplication = useCallback((applicationId: string) => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.application(applicationId),
      queryFn: () => fundingApplicationsAPI.getApplication(applicationId),
    });
  }, [queryClient]);

  const setApplicationData = useCallback((applicationId: string, data: IFundingApplication) => {
    queryClient.setQueryData(QUERY_KEYS.application(applicationId), data);
  }, [queryClient]);

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
export const useApplicationStatus = (programId?: string, chainId?: number) => {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({ applicationId, status, note }: { 
      applicationId: string; 
      status: string; 
      note?: string 
    }) =>
      fundingApplicationsAPI.updateApplicationStatus(applicationId, {
        status: status as any,
        reason: note || '',
      }),
    onSuccess: (_, variables) => {
      // Invalidate and refetch application data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.application(variables.applicationId) });
      
      // Invalidate applications list if programId and chainId are provided
      if (programId && chainId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.applications(programId, chainId, { limit: 25 })
        });
      }
      
      // Invalidate all applications lists
      queryClient.invalidateQueries({ queryKey: ['funding-applications'] });
      
      toast.success('Application status updated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to update application status';
      toast.error(errorMessage);
      console.error('Failed to update application status:', error);
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
export const useApplicationComments = (applicationId: string | null, isAdmin: boolean = false) => {
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
    mutationFn: ({ content, authorName }: { content: string; authorName?: string }) =>
      applicationCommentsService.createComment(applicationId!, content, authorName),
    onSuccess: () => {
      // Invalidate and refetch comments after successful creation
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.applicationComments(applicationId!)
      });
      toast.success('Comment added successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to add comment';
      toast.error(errorMessage);
      errorManager(errorMessage, error);
      console.error('Failed to add comment:', error);
    },
  });

  // Mutation for editing comments
  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      applicationCommentsService.editComment(commentId, content),
    onSuccess: () => {
      // Invalidate and refetch comments after successful edit
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.applicationComments(applicationId!) 
      });
      toast.success('Comment updated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to edit comment';
      toast.error(errorMessage);
      console.error('Failed to edit comment:', error);
    },
  });

  // Mutation for deleting comments
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      applicationCommentsService.deleteComment(commentId),
    onSuccess: () => {
      // Refetch comments after deletion
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.applicationComments(applicationId!) 
      });
      toast.success('Comment deleted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to delete comment';
      toast.error(errorMessage);
      console.error('Failed to delete comment:', error);
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
      // Sort versions by version number descending (newest first)
      return data.sort((a, b) => b.versionNumber - a.versionNumber);
    },
  });

  // Helper to get reference number
  const getReferenceNumber = useCallback(async () => {
    if (!applicationIdOrReference) return null;
    
    // If it's already a reference number, return it
    if (applicationIdOrReference.startsWith('APP-')) {
      return applicationIdOrReference;
    }
    
    // Otherwise, fetch the application to get the reference number
    try {
      const application = await fundingApplicationsAPI.getApplication(applicationIdOrReference);
      return application.referenceNumber;
    } catch (error) {
      console.error('Failed to get reference number:', error);
      return null;
    }
  }, [applicationIdOrReference]);

  // Prefetch versions
  const prefetchVersions = useCallback((applicationIdOrReference: string) => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.applicationVersions(applicationIdOrReference),
      queryFn: () => fundingApplicationsAPI.getApplicationVersions(applicationIdOrReference),
    });
  }, [queryClient]);

  // Invalidate versions cache
  const invalidateVersions = useCallback(() => {
    if (applicationIdOrReference) {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.applicationVersions(applicationIdOrReference) 
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
