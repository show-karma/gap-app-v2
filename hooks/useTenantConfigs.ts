import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  tenantConfigService,
  type CreateTenantConfigRequest,
  type UpdateTenantConfigRequest,
} from "@/services/tenantConfigService";

// Re-export types for convenience
export type {
  TenantConfig,
  CreateTenantConfigRequest,
  UpdateTenantConfigRequest,
  TenantTheme,
  TenantAssets,
  TenantNavigation,
  TenantContent,
  WhitelabelUrls,
} from "@/services/tenantConfigService";

interface UseTenantConfigsOptions {
  enabled?: boolean;
  activeOnly?: boolean;
}

export const useTenantConfigs = (
  communityId: string,
  options: UseTenantConfigsOptions = {}
) => {
  const { enabled = true, activeOnly = false } = options;

  return useQuery({
    queryKey: ["tenantConfigs", communityId, { activeOnly }],
    queryFn: () => {
      if (activeOnly) {
        return tenantConfigService.getActiveByCommunity(communityId);
      }
      return tenantConfigService.getByCommunity(communityId);
    },
    enabled: enabled && !!communityId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useTenantConfig = (tenantId: string, enabled = true) => {
  return useQuery({
    queryKey: ["tenantConfig", tenantId],
    queryFn: () => tenantConfigService.getById(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useCreateTenantConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTenantConfigRequest) =>
      tenantConfigService.create(request),
    onSuccess: (data) => {
      // Invalidate and refetch tenant configs for the community
      queryClient.invalidateQueries({
        queryKey: ["tenantConfigs", data.communityUID],
      });
    },
  });
};

export const useUpdateTenantConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateTenantConfigRequest) =>
      tenantConfigService.update(request),
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["tenantConfig", data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["tenantConfigs", data.communityUID],
      });
    },
  });
};

export const useDeleteTenantConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, communityUID }: { tenantId: string; communityUID: string }) =>
      tenantConfigService.delete(tenantId),
    onSuccess: (_, variables) => {
      // Invalidate tenant configs for the community
      queryClient.invalidateQueries({
        queryKey: ["tenantConfigs", variables.communityUID],
      });
    },
  });
};

export const useActivateTenantConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => tenantConfigService.activate(slug),
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["tenantConfig", data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["tenantConfigs", data.communityUID],
      });
    },
  });
};

export const useDeactivateTenantConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => tenantConfigService.deactivate(slug),
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["tenantConfig", data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["tenantConfigs", data.communityUID],
      });
    },
  });
};
