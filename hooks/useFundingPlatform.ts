import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fundingPlatformService, IApplicationFilters } from '@/services/fundingPlatformService';
import { IFormSchema, IFundingApplication, IFundingProgramConfig } from '@/types/funding-platform';
import toast from 'react-hot-toast';

// Query keys for caching
const QUERY_KEYS = {
  programs: (communityId: string) => ['grant-programs', communityId],
  programConfig: (programId: string, chainId: number) => ['program-config', programId, chainId],
  programStats: (programId: string, chainId: number) => ['program-stats', programId, chainId],
  applications: (programId: string, chainId: number, filters: IApplicationFilters) => 
    ['applications', programId, chainId, filters],
  application: (applicationId: string) => ['application', applicationId],
  applicationStats: (programId: string, chainId: number) => ['application-stats', programId, chainId],
  enabledPrograms: ['enabled-programs'],
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

  const enabledProgramsQuery = useQuery({
    queryKey: QUERY_KEYS.enabledPrograms,
    queryFn: () => fundingPlatformService.programs.getEnabledPrograms(),
  });

  return {
    programs: programsQuery.data || [],
    enabledPrograms: enabledProgramsQuery.data || [],
    isLoading: programsQuery.isLoading || enabledProgramsQuery.isLoading,
    error: programsQuery.error || enabledProgramsQuery.error,
    refetch: () => {
      programsQuery.refetch();
      enabledProgramsQuery.refetch();
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

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.programStats(programId, chainId),
    queryFn: () => fundingPlatformService.programs.getProgramStats(programId, chainId),
    enabled: !!programId && !!chainId,
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: Partial<IFundingProgramConfig>) =>
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enabledPrograms });
      toast.success('Program status updated successfully');
    },
    onError: (error) => {
      console.error('Failed to toggle program status:', error);
      toast.error('Failed to update program status');
    },
  });

  return {
    config: configQuery.data,
    stats: statsQuery.data,
    isLoading: configQuery.isLoading || statsQuery.isLoading,
    error: configQuery.error || statsQuery.error,
    updateConfig: updateConfigMutation.mutate,
    updateFormSchema: updateFormSchemaMutation.mutate,
    toggleStatus: toggleStatusMutation.mutate,
    isUpdating: updateConfigMutation.isPending || updateFormSchemaMutation.isPending || toggleStatusMutation.isPending,
    refetch: () => {
      configQuery.refetch();
      statsQuery.refetch();
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
    queryFn: () => fundingPlatformService.applications.getApplications(programId, chainId, filters),
    enabled: !!programId && !!chainId,
  });

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.applicationStats(programId, chainId),
    queryFn: () => fundingPlatformService.applications.getApplicationStatistics(programId, chainId),
    enabled: !!programId && !!chainId,
  });

  const submitApplicationMutation = useMutation({
    mutationFn: (applicationData: Record<string, any>) =>
      fundingPlatformService.applications.submitApplication(programId, chainId, applicationData),
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
      fundingPlatformService.applications.updateApplicationStatus(applicationId, status, note),
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
    total: applicationsQuery.data?.total || 0,
    page: applicationsQuery.data?.page || 1,
    totalPages: applicationsQuery.data?.totalPages || 1,
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
      fundingPlatformService.applications.updateApplicationStatus(applicationId, status, note),
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