import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fundingPlatformService } from '@/services/fundingPlatformService';
import { FormSchema } from '@/types/question-builder';
import toast from 'react-hot-toast';
import { IFundingProgramConfig } from '@/types/funding-platform';

// Query keys for caching
const QUERY_KEYS = {
  questionSchema: (programId: string, chainId: number) => ['question-schema', programId, chainId],
  programConfig: (programId: string, chainId: number) => ['program-config', programId, chainId],
};

/**
 * Generic hook factory for managing form schemas
 */
function createFormSchemaHook(
  schemaType: 'application' | 'postApproval',
  options?: {
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const isPostApproval = schemaType === 'postApproval';
  const schemaField = isPostApproval ? 'postApprovalFormSchema' : 'formSchema';
  const successMessage = options?.successMessage ||
    (isPostApproval ? 'Post approval form schema saved successfully' : 'Form schema saved successfully');
  const errorMessage = options?.errorMessage ||
    (isPostApproval ? 'Failed to save post approval form schema' : 'Failed to save form schema');

  return function useFormSchema(programId: string, chainId: number) {
    const queryClient = useQueryClient();
    const queryKey = isPostApproval
      ? [...QUERY_KEYS.questionSchema(programId, chainId), 'post-approval']
      : QUERY_KEYS.questionSchema(programId, chainId);

    const schemaQuery = useQuery({
      queryKey,
      queryFn: async () => {
        try {
          const config = await fundingPlatformService.programs.getProgramConfiguration(programId, chainId);

          // Return the form schema based on type
          if (isPostApproval && config?.applicationConfig?.postApprovalFormSchema) {
            return config.applicationConfig.postApprovalFormSchema as FormSchema;
          } else if (!isPostApproval && config?.applicationConfig?.formSchema) {
            return config.applicationConfig.formSchema as FormSchema;
          }

          // Return null if no schema found
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
      mutationFn: async ({schema, existingConfig}: {schema: FormSchema, existingConfig?: IFundingProgramConfig | null}) => {

        // Build the updated configuration based on type
        let updatedConfig: Partial<IFundingProgramConfig>;
        if (isPostApproval) {
          updatedConfig = {
            ...existingConfig,
            postApprovalFormSchema: schema as any,
          };
        } else {
          updatedConfig = {
            ...existingConfig,
            formSchema: schema as any,
          };
        }

        if (!existingConfig) {
          return fundingPlatformService.programs.createProgramConfiguration(programId, chainId, updatedConfig);
        }

        return fundingPlatformService.programs.updateProgramConfiguration(programId, chainId, updatedConfig);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId, chainId) });
        toast.success(successMessage);
      },
      onError: (error) => {
        console.error(`Failed to save ${schemaType} schema:`, error);
        toast.error(errorMessage);
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
}

/**
 * Hook for managing React Hook Form question builder schemas using existing configuration endpoint
 */
export const useQuestionBuilderSchema = createFormSchemaHook('application');

/**
 * Hook for managing post-approval form schemas using existing configuration endpoint
 */
export const usePostApprovalSchema = createFormSchemaHook('postApproval');