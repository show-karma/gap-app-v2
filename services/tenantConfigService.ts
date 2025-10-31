import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";

export interface TenantThemeConfig {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    background: string;
    foreground: string;
    buttontext: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    sans: string[];
    mono: string[];
  };
  radius: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface TenantTheme {
  light: TenantThemeConfig;
  dark: TenantThemeConfig;
}

export interface TenantAssets {
  logo?: string;
  logoDark?: string;
  favicon?: string;
  ogImage?: string;
}

export interface NavItem {
  label: string;
  href?: string;
  isExternal?: boolean;
  items?: NavItem[];
}

export interface TenantNavigation {
  header?: {
    logo?: {
      className?: string;
      width?: number;
      height?: number;
    };
    title?: string;
    shouldHaveTitle?: boolean;
    poweredBy?: boolean;
  };
  items: NavItem[];
  socialLinks?: {
    twitter?: string;
    discord?: string;
    github?: string;
    docs?: string;
    telegram?: string;
    paragraph?: string;
  };
}

export interface TenantContent {
  subtitle?: string;
  openFundingRoundsTitle?: string;
}

export interface WhitelabelUrls {
  stagingUrl?: string;
  prodUrl?: string;
  isActive: boolean;
}

export interface TenantConfig {
  id: string;
  name: string;
  slug: string; // Unique identifier (replaces deprecated tenantId)
  communityUID: string;
  chainId: number;
  status: string;
  theme: TenantTheme;
  assets: TenantAssets;
  navigation: TenantNavigation;
  content: TenantContent;
  domains?: WhitelabelUrls;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string;
  updatedBy: string;
}

export interface CreateTenantConfigRequest {
  name: string;
  slug: string;
  communityUID: string;
  chainId: number;
  theme: TenantTheme;
  assets: TenantAssets;
  navigation: TenantNavigation;
  content: TenantContent;
  domains?: WhitelabelUrls;
}

export interface UpdateTenantConfigRequest {
  slug: string; // Unique identifier for the tenant to update
  name?: string;
  status?: string;
  theme?: TenantTheme;
  assets?: TenantAssets;
  navigation?: TenantNavigation;
  content?: TenantContent;
  domains?: WhitelabelUrls;
}

export const tenantConfigService = {
  // Get tenant config for a community (1:1 relationship)
  getByCommunity: async (communityUID: string): Promise<TenantConfig | null> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.V2.TENANT_CONFIG.GET_BY_COMMUNITY(communityUID),
        "GET",
        {},
        {},
        {},
        true,
        false
      );

      if (error) {
        if (error.includes("404") || error.includes("not found")) {
          return null;
        }
        throw new Error(error);
      }

      const config = data?.data || data;

      if (!config) {
        return null;
      }

      return {
        ...config,
        createdAt: new Date(config.createdAt),
        updatedAt: new Date(config.updatedAt),
      };
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.message?.includes("not found")) {
        return null;
      }
      errorManager("Error fetching tenant config", error);
      throw error;
    }
  },

  // Get active tenant config for a community (1:1 relationship)
  getActiveByCommunity: async (
    communityUID: string
  ): Promise<TenantConfig | null> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.V2.TENANT_CONFIG.GET_ACTIVE_BY_COMMUNITY(communityUID),
        "GET",
        {},
        {},
        {},
        true,
        false
      );

      if (error) {
        if (error.includes("404") || error.includes("not found")) {
          return null;
        }
        throw new Error(error);
      }

      const config = data?.data || data;

      if (!config) {
        return null;
      }

      return {
        ...config,
        createdAt: new Date(config.createdAt),
        updatedAt: new Date(config.updatedAt),
      };
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.message?.includes("not found")) {
        return null;
      }
      errorManager("Error fetching active tenant config", error);
      throw error;
    }
  },

  // Get tenant config by ID
  getById: async (tenantId: string): Promise<TenantConfig> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.V2.TENANT_CONFIG.GET_BY_ID(tenantId),
        "GET",
        {},
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }

      const config = data?.data || data;
      return {
        ...config,
        createdAt: new Date(config.createdAt),
        updatedAt: new Date(config.updatedAt),
      };
    } catch (error: any) {
      errorManager(`Error fetching tenant config ${tenantId}`, error);
      throw error;
    }
  },

  // Create a new tenant config
  create: async (
    request: CreateTenantConfigRequest
  ): Promise<TenantConfig> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.V2.TENANT_CONFIG.CREATE(),
        "POST",
        request,
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }

      const config = data?.data || data;
      return {
        ...config,
        createdAt: new Date(config.createdAt),
        updatedAt: new Date(config.updatedAt),
      };
    } catch (error: any) {
      errorManager("Error creating tenant config", error);
      throw error;
    }
  },

  // Update an existing tenant config
  update: async (
    request: UpdateTenantConfigRequest
  ): Promise<TenantConfig> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.V2.TENANT_CONFIG.UPDATE(request.slug),
        "PATCH",
        request,
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }

      const config = data?.data || data;
      return {
        ...config,
        createdAt: new Date(config.createdAt),
        updatedAt: new Date(config.updatedAt),
      };
    } catch (error: any) {
      errorManager(`Error updating tenant config ${request.slug}`, error);
      throw error;
    }
  },

  // Delete a tenant config
  delete: async (slug: string): Promise<void> => {
    try {
      const [, error] = await fetchData(
        INDEXER.V2.TENANT_CONFIG.DELETE(slug),
        "DELETE",
        {},
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }
    } catch (error: any) {
      errorManager(`Error deleting tenant config ${slug}`, error);
      throw error;
    }
  },

  // Activate a tenant config
  activate: async (slug: string): Promise<TenantConfig> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.V2.TENANT_CONFIG.ACTIVATE(slug),
        "POST",
        {},
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }

      const config = data?.data || data;
      return {
        ...config,
        createdAt: new Date(config.createdAt),
        updatedAt: new Date(config.updatedAt),
      };
    } catch (error: any) {
      errorManager(`Error activating tenant config ${slug}`, error);
      throw error;
    }
  },

  // Deactivate a tenant config
  deactivate: async (slug: string): Promise<TenantConfig> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.V2.TENANT_CONFIG.DEACTIVATE(slug),
        "POST",
        {},
        {},
        {},
        true,
        false
      );

      if (error) {
        throw new Error(error);
      }

      const config = data?.data || data;
      return {
        ...config,
        createdAt: new Date(config.createdAt),
        updatedAt: new Date(config.updatedAt),
      };
    } catch (error: any) {
      errorManager(`Error deactivating tenant config ${slug}`, error);
      throw error;
    }
  },
};
