import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";
import { fundingPlatformService } from "@/services/fundingPlatformService";
import type { IFundingProgramConfig } from "@/types/funding-platform";
import type { FormSchema } from "@/types/question-builder";

// Query keys for caching
const QUERY_KEYS = {
  questionSchema: (programId: string, chainId: number) => ["question-schema", programId, chainId],
  programConfig: (programId: string, chainId: number) => ["program-config", programId, chainId],
};

/**
 * Generic hook factory for managing form schemas
 */
function createFormSchemaHook(
  schemaType: "application" | "postApproval",
  options?: {
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const isPostApproval = schemaType === "postApproval";
  const schemaField = isPostApproval ? "postApprovalFormSchema" : "formSchema";
  const successMessage =
    options?.successMessage ||
    (isPostApproval
      ? "Post approval form schema saved successfully"
      : "Form schema saved successfully");
  const errorMessage =
    options?.errorMessage ||
    (isPostApproval ? "Failed to save post approval form schema" : "Failed to save form schema");

  return function useFormSchema(programId: string, chainId: number) {
    const queryClient = useQueryClient();
    const queryKey = isPostApproval
      ? [...QUERY_KEYS.questionSchema(programId, chainId), "post-approval"]
      : QUERY_KEYS.questionSchema(programId, chainId);

    const schemaQuery = useQuery({
      queryKey,
      queryFn: async () => {
        try {
          const result = await fundingPlatformService.programs.getProgramConfiguration(
            programId,
            chainId
          );

          // The service returns FundingProgram type, config is in applicationConfig
          const config = result?.applicationConfig;

          if (!config) {
            return null;
          }

          // Return the form schema based on type (schemas are directly on IFundingProgramConfig)
          const schema = config[schemaField];
          return schema ? (schema as FormSchema) : null;
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
      mutationFn: async ({
        schema,
        existingConfig,
      }: {
        schema: FormSchema;
        existingConfig?: IFundingProgramConfig | null;
      }) => {
        if (!existingConfig) {
          // Create minimal valid configuration for new configs
          // The backend should handle setting defaults for other required fields
          const newConfig: Partial<IFundingProgramConfig> = {
            programId,
            chainID: chainId,
            [schemaField]: schema,
            isEnabled: true,
          };
          return fundingPlatformService.programs.createProgramConfiguration(
            programId,
            chainId,
            newConfig
          );
        }

        // For existing configs, preserve all fields and only update the relevant schema
        const updatedConfig: IFundingProgramConfig = {
          ...existingConfig,
          [schemaField]: schema,
        };

        return fundingPlatformService.programs.updateProgramConfiguration(
          programId,
          chainId,
          updatedConfig
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.programConfig(programId, chainId),
        });
        toast.success(successMessage);
      },
      onError: (error: AxiosError<{ message?: string }>) => {
        console.error(`Failed to save ${schemaType} schema:`, error);
        // Extract specific error message from API response (e.g., validation errors)
        const apiErrorMessage = error.response?.data?.message;
        toast.error(apiErrorMessage || errorMessage);
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
export const useQuestionBuilderSchema = createFormSchemaHook("application");

/**
 * Hook for managing post-approval form schemas using existing configuration endpoint
 */
export const usePostApprovalSchema = createFormSchemaHook("postApproval");
