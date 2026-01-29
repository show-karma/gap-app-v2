import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { KycBatchStatusResponse, KycConfigResponse, KycStatusResponse } from "@/types/kyc";
import fetchData from "@/utilities/fetchData";
import {
  KYC_QUERY_KEYS,
  useKycBatchStatuses,
  useKycConfig,
  useKycFormUrl,
  useKycStatus,
  useSaveKycConfig,
} from "../useKycStatus";

// Mock the fetchData utility
jest.mock("@/utilities/fetchData");

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

describe("KYC Hooks", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const createMockKycStatus = (overrides: Partial<KycStatusResponse> = {}): KycStatusResponse => ({
    projectUID: "project-123",
    communityUID: "community-456",
    status: "VERIFIED",
    verificationType: "KYC",
    verifiedAt: "2024-01-01T00:00:00Z",
    expiresAt: "2025-01-01T00:00:00Z",
    isExpired: false,
    ...overrides,
  });

  const createMockKycConfig = (overrides: Partial<KycConfigResponse> = {}): KycConfigResponse => ({
    communityUID: "community-456",
    providerType: "TREOVA",
    providerName: "Treova",
    kycFormUrl: "https://kyc.treova.ai/cmp_test",
    kybFormUrl: "https://kyb.treova.ai/cmp_test",
    validityMonths: 12,
    isEnabled: true,
    ...overrides,
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("useKycStatus", () => {
    describe("successful data fetching", () => {
      it("should fetch KYC status for a project", async () => {
        const mockStatus = createMockKycStatus();
        mockFetchData.mockResolvedValue([mockStatus, null]);

        const { result } = renderHook(() => useKycStatus("project-123", "community-456"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.status).toEqual(mockStatus);
        expect(result.current.error).toBeNull();
      });

      it("should return null when no status exists", async () => {
        mockFetchData.mockResolvedValue([null, null]);

        const { result } = renderHook(() => useKycStatus("project-123", "community-456"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.status).toBeNull();
      });

      it("should handle expired status", async () => {
        const mockStatus = createMockKycStatus({
          status: "EXPIRED",
          isExpired: true,
        });
        mockFetchData.mockResolvedValue([mockStatus, null]);

        const { result } = renderHook(() => useKycStatus("project-123", "community-456"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.status?.status).toBe("EXPIRED");
        expect(result.current.status?.isExpired).toBe(true);
      });
    });

    describe("disabled state", () => {
      it("should not fetch when projectUID is undefined", async () => {
        const { result } = renderHook(() => useKycStatus(undefined, "community-456"), { wrapper });

        expect(mockFetchData).not.toHaveBeenCalled();
        expect(result.current.status).toBeUndefined();
      });

      it("should not fetch when communityUID is undefined", async () => {
        const { result } = renderHook(() => useKycStatus("project-123", undefined), { wrapper });

        expect(mockFetchData).not.toHaveBeenCalled();
        expect(result.current.status).toBeUndefined();
      });

      it("should not fetch when enabled is false", async () => {
        const { result } = renderHook(
          () => useKycStatus("project-123", "community-456", { enabled: false }),
          { wrapper }
        );

        expect(mockFetchData).not.toHaveBeenCalled();
        expect(result.current.status).toBeUndefined();
      });
    });

    describe("error handling", () => {
      it("should handle fetch errors", async () => {
        mockFetchData.mockResolvedValue([null, "API Error"]);

        const { result } = renderHook(() => useKycStatus("project-123", "community-456"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe("useKycConfig", () => {
    describe("successful data fetching", () => {
      it("should fetch KYC config for a community", async () => {
        const mockConfig = createMockKycConfig();
        mockFetchData.mockResolvedValue([mockConfig, null]);

        const { result } = renderHook(() => useKycConfig("optimism"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.config).toEqual(mockConfig);
        expect(result.current.isEnabled).toBe(true);
      });

      it("should return isEnabled=false when config is disabled", async () => {
        const mockConfig = createMockKycConfig({ isEnabled: false });
        mockFetchData.mockResolvedValue([mockConfig, null]);

        const { result } = renderHook(() => useKycConfig("optimism"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isEnabled).toBe(false);
      });

      it("should return null when config does not exist (404)", async () => {
        // Mock a successful response with null data (config not found)
        mockFetchData.mockResolvedValue([null, null]);

        const { result } = renderHook(() => useKycConfig("optimism"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.config).toBeNull();
        expect(result.current.isEnabled).toBe(false);
      });
    });

    describe("disabled state", () => {
      it("should not fetch when communityIdOrSlug is undefined", async () => {
        const { result } = renderHook(() => useKycConfig(undefined), {
          wrapper,
        });

        expect(mockFetchData).not.toHaveBeenCalled();
        expect(result.current.config).toBeUndefined();
      });
    });
  });

  describe("useKycBatchStatuses", () => {
    describe("successful data fetching", () => {
      it("should fetch batch statuses for multiple projects", async () => {
        const mockResponse: KycBatchStatusResponse = {
          statuses: {
            "project-1": createMockKycStatus({ projectUID: "project-1" }),
            "project-2": createMockKycStatus({
              projectUID: "project-2",
              status: "PENDING",
            }),
            "project-3": null,
          },
        };
        mockFetchData.mockResolvedValue([mockResponse, null]);

        const projectUIDs = ["project-1", "project-2", "project-3"];

        const { result } = renderHook(() => useKycBatchStatuses("community-456", projectUIDs), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.statuses.size).toBe(3);
        expect(result.current.getStatus("project-1")?.status).toBe("VERIFIED");
        expect(result.current.getStatus("project-2")?.status).toBe("PENDING");
        expect(result.current.getStatus("project-3")).toBeNull();
      });

      it("should return empty map when projectUIDs is empty", async () => {
        const { result } = renderHook(() => useKycBatchStatuses("community-456", []), { wrapper });

        expect(mockFetchData).not.toHaveBeenCalled();
        expect(result.current.statuses.size).toBe(0);
      });
    });

    describe("disabled state", () => {
      it("should not fetch when communityUID is undefined", async () => {
        const { result } = renderHook(() => useKycBatchStatuses(undefined, ["project-1"]), {
          wrapper,
        });

        expect(mockFetchData).not.toHaveBeenCalled();
        expect(result.current.statuses.size).toBe(0);
      });
    });

    describe("getStatus helper", () => {
      it("should return null for unknown projectUID", async () => {
        const mockResponse: KycBatchStatusResponse = {
          statuses: {
            "project-1": createMockKycStatus({ projectUID: "project-1" }),
          },
        };
        mockFetchData.mockResolvedValue([mockResponse, null]);

        const { result } = renderHook(() => useKycBatchStatuses("community-456", ["project-1"]), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.getStatus("unknown-project")).toBeNull();
      });
    });
  });

  describe("useKycFormUrl", () => {
    it("should get form URL successfully", async () => {
      const mockResponse = {
        formUrl: "https://kyc.treova.ai/form?karma_application_id=REF-001",
        applicationReference: "REF-001",
        verificationType: "KYC" as const,
      };
      mockFetchData.mockResolvedValue([mockResponse, null]);

      const { result } = renderHook(() => useKycFormUrl(), { wrapper });

      let mutationResult: typeof mockResponse | undefined;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({
          communityIdOrSlug: "optimism",
          projectUID: "project-123",
          verificationType: "KYC",
          walletAddress: "0x123",
        });
      });

      expect(mutationResult?.formUrl).toContain("kyc.treova.ai");
    });

    it("should handle errors", async () => {
      mockFetchData.mockResolvedValue([null, "Failed to get form URL"]);

      const { result } = renderHook(() => useKycFormUrl(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            communityIdOrSlug: "optimism",
            projectUID: "project-123",
            verificationType: "KYC",
          });
        })
      ).rejects.toThrow();
    });
  });

  describe("useSaveKycConfig", () => {
    it("should save config successfully", async () => {
      const mockConfig = createMockKycConfig();
      mockFetchData.mockResolvedValue([mockConfig, null]);

      const { result } = renderHook(() => useSaveKycConfig("optimism"), {
        wrapper,
      });

      let mutationResult: typeof mockConfig | undefined;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({
          providerType: "TREOVA",
          providerName: "Treova",
          kycFormUrl: "https://kyc.treova.ai/test",
          kybFormUrl: "https://kyb.treova.ai/test",
          validityMonths: 12,
          isEnabled: true,
        });
      });

      expect(mutationResult).toEqual(mockConfig);
    });

    it("should throw error when communityIdOrSlug is undefined", async () => {
      const { result } = renderHook(() => useSaveKycConfig(undefined), {
        wrapper,
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            providerType: "TREOVA",
            providerName: "Treova",
            kycFormUrl: "https://kyc.treova.ai/test",
            kybFormUrl: "https://kyb.treova.ai/test",
            validityMonths: 12,
            isEnabled: true,
          });
        })
      ).rejects.toThrow("Community ID is required");
    });

    it("should invalidate config cache on success", async () => {
      const mockConfig = createMockKycConfig();
      mockFetchData.mockResolvedValue([mockConfig, null]);

      const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useSaveKycConfig("optimism"), {
        wrapper,
      });

      await act(async () => {
        await result.current.mutateAsync({
          providerType: "TREOVA",
          providerName: "Treova",
          kycFormUrl: "https://kyc.treova.ai/test",
          kybFormUrl: "https://kyb.treova.ai/test",
          validityMonths: 12,
          isEnabled: true,
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: KYC_QUERY_KEYS.config("optimism"),
      });
    });
  });

  describe("KYC_QUERY_KEYS", () => {
    it("should generate correct status query key", () => {
      const key = KYC_QUERY_KEYS.status("project-123", "community-456");
      expect(key).toEqual(["kyc", "status", "project-123", "community-456"]);
    });

    it("should generate correct config query key", () => {
      const key = KYC_QUERY_KEYS.config("optimism");
      expect(key).toEqual(["kyc", "config", "optimism"]);
    });

    it("should generate correct batch statuses query key", () => {
      const key = KYC_QUERY_KEYS.batchStatuses("community-456", ["project-1", "project-2"]);
      expect(key).toEqual(["kyc", "batch", "community-456", "project-1,project-2"]);
    });
  });
});
