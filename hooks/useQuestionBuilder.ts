import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fundingPlatformService } from '@/services/fundingPlatformService';
import { FormSchema } from '@/types/question-builder';
import toast from 'react-hot-toast';

// Query keys for caching
const QUERY_KEYS = {
  questionSchema: (programId: string, chainId: number) => ['question-schema', programId, chainId],
  programConfig: (programId: string, chainId: number) => ['program-config', programId, chainId],
};

/**
 * Hook for managing React Hook Form question builder schemas using existing configuration endpoint
 */
export const useQuestionBuilderSchema = (programId: string, chainId: number) => {
  const queryClient = useQueryClient();

  const schemaQuery = useQuery({
    queryKey: QUERY_KEYS.questionSchema(programId, chainId),
    queryFn: async () => {
      try {
        const config = await fundingPlatformService.programs.getProgramConfiguration(programId, chainId);
        
        // Check if this is a React Hook Form schema
        if (config.schemaType === 'react-hook-form' || 
            (config.formSchema && !config.schemaType)) { // Backward compatibility
          return config.formSchema as FormSchema;
        }
        
        // Return null if no React Hook Form schema found
        return null;
      } catch (error: any) {
        // If config doesn't exist yet, return null instead of throwing
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!programId && !!chainId,
  });

  const updateSchemaMutation = useMutation({
    mutationFn: async (schema: FormSchema) => {
      // First get existing configuration
      const existingConfig = await fundingPlatformService.programs.getProgramConfiguration(programId, chainId);
      
      // Update with new question schema and mark schema type
      const updatedConfig = {
        ...existingConfig,
        formSchema: schema,
        schemaType: 'react-hook-form' as const
      };
      
      return fundingPlatformService.programs.updateProgramConfiguration(programId, chainId, updatedConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.questionSchema(programId, chainId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId, chainId) });
      toast.success('Form schema saved successfully');
    },
    onError: (error) => {
      console.error('Failed to save question builder schema:', error);
      toast.error('Failed to save form schema');
    },
  });

  return {
    schema: schemaQuery.data,
    isLoading: schemaQuery.isLoading,
    error: schemaQuery.error,
    updateSchema: updateSchemaMutation.mutate,
    isUpdating: updateSchemaMutation.isPending,
    refetch: schemaQuery.refetch,
  };
};