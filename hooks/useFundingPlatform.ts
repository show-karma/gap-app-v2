import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fundingPlatformService, IApplicationFilters } from '@/services/fundingPlatformService';
import { 
  IFormSchema, 
  IFundingApplication, 
  IFundingProgramConfig,
  IApplicationSubmitRequest,
  IApplicationUpdateRequest,
  IApplicationStatusUpdateRequest,
  FundingApplicationStatusV2,
  ExportFormat
} from '@/types/funding-platform';
import toast from 'react-hot-toast';

// Query keys for caching
const QUERY_KEYS = {
  programs: (communityId: string) => ['grant-programs', communityId],
  programConfig: (programId: string, chainId: number) => ['program-config', programId, chainId],
  programStats: (programId: string, chainId: number) => ['program-stats', programId, chainId],
  applications: (programId: string, chainId: number, filters: IApplicationFilters) => 
    ['applications', programId, chainId, filters],
  application: (applicationId: string) => ['application', applicationId],
  applicationByReference: (referenceNumber: string) => ['application-by-reference', referenceNumber],
  applicationByEmail: (programId: string, chainId: number, email: string) => 
    ['application-by-email', programId, chainId, email],
  applicationStats: (programId: string, chainId: number) => ['application-stats', programId, chainId],
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
 * Hook for managing grant applications
 */
export const useFundingApplications = (
  programId: string, 
  chainId: number, 
  filters: IApplicationFilters = {}
) => {
  const queryClient = useQueryClient();

  const applicationsQuery = useQuery({
    queryKey: QUERY_KEYS.applications(programId, chainId, filters),
    queryFn: () => fundingPlatformService.applications.getApplicationsByProgram(programId, chainId, filters),
    enabled: !!programId && !!chainId,
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applications(programId, chainId, {}) });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applications(programId, chainId, {}) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applicationStats(programId, chainId) });
      toast.success('Application status updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update application status:', error);
      toast.error('Failed to update application status');
    },
  });

  const exportApplications = useCallback(async (format: 'json' | 'csv' = 'json') => {
    try {
      const data = await fundingPlatformService.applications.exportApplications(
        programId, 
        chainId, 
        format, 
        filters
      );
      
      // Create and download file
      const blob = new Blob([format === 'json' ? JSON.stringify(data, null, 2) : data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `grant-applications-${programId}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Applications exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export applications:', error);
      toast.error('Failed to export applications');
    }
  }, [programId, chainId, filters]);

  return {
    applications: applicationsQuery.data?.applications || [],
    total: applicationsQuery.data?.pagination?.total || 0,
    page: applicationsQuery.data?.pagination?.page || 1,
    totalPages: applicationsQuery.data?.pagination?.totalPages || 1,
    stats: statsQuery.data,
    isLoading: applicationsQuery.isLoading || statsQuery.isLoading,
    error: applicationsQuery.error || statsQuery.error,
    submitApplication: submitApplicationMutation.mutate,
    updateApplicationStatus: updateStatusMutation.mutate,
    exportApplications,
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
        queryKey: QUERY_KEYS.applications(programId, chainId, {}) 
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
    onSuccess: (data, variables) => {
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
      const data = isAdmin 
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
      const filePrefix = isAdmin ? 'admin-applications' : 'applications';
      link.download = `${filePrefix}-${programId}-${new Date().toISOString().split('T')[0]}.${format}`;
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
 * Hook for real-time AI evaluation of application data
 */
export const useApplicationRealTimeEvaluation = (programId: string, chainId: number) => {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    rating: number;
    feedback: string;
    suggestions: string[];
    isComplete: boolean;
    evaluatedAt: string;
    model: string;
  } | null>(null);

  const evaluateApplication = useCallback(async (applicationData: Record<string, any>) => {
    setIsEvaluating(true);
    setEvaluationResult(null);
    
    try {
      const result = await fundingPlatformService.applications.evaluateRealTime(
        programId,
        chainId,
        applicationData
      );
      
      if (result.success) {
        setEvaluationResult(result.data);
        return result.data;
      } else {
        throw new Error('Evaluation failed');
      }
    } catch (error) {
      console.error('Failed to evaluate application:', error);
      toast.error('Failed to evaluate application');
      throw error;
    } finally {
      setIsEvaluating(false);
    }
  }, [programId, chainId]);

  return {
    evaluateApplication,
    isEvaluating,
    evaluationResult,
  };
}; 