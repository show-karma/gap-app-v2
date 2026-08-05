import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import {
  type KycBatchStatusResponse,
  type KycConfigResponse,
  KycProviderType,
  type KycStatusResponse,
  KycVerificationStatus,
  KycVerificationType,
} from "@/types/kyc";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";
import {
  KYC_QUERY_KEYS,
  useKycBatchStatuses,
  useKycConfig,
  useKycFormUrl,
  useKycStatus,
  useSaveKycConfig,
  useSetKycApplicability,
} from "../useKycStatus";

// Mock the typed api client
vi.mock("@/utilities/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockToast = toast as unknown as {
  success: vi.Mock;
  error: vi.Mock;
};

const mockApi = api as unknown as {
  get: vi.Mock;
  post: vi.Mock;
  put: vi.Mock;
};

const httpError = (status: number, message: string) =>
  new HttpError(status, {
    endpoint: "/kyc",
    method: "GET",
    body: { message },
  });

describe("KYC Hooks", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const createMockKycStatus = (overrides: Partial<KycStatusResponse> = {}): KycStatusResponse => ({
    projectUID: "project-123",
    communityUID: "community-456",
    status: KycVerificationStatus.VERIFIED,
    verificationType: KycVerificationType.KYC,
    verifiedAt: "2024-01-01T00:00:00Z",
    expiresAt: "2025-01-01T00:00:00Z",
    isExpired: false,
    ...overrides,
  });

  const createMockKycConfig = (overrides: Partial<KycConfigResponse> = {}): KycConfigResponse => ({
    communityUID: "community-456",
    providerType: KycProviderType.TREOVA,
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
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("useKycStatus", () => {
    describe("successful data fetching", () => {
      it("should fetch KYC status for a project", async () => {
        const mockStatus = createMockKycStatus();
        mockApi.get.mockResolvedValue(mockStatus);

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
        mockApi.get.mockResolvedValue(null);

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
          status: KycVerificationStatus.EXPIRED,
          isExpired: true,
        });
        mockApi.get.mockResolvedValue(mockStatus);

        const { result } = renderHook(() => useKycStatus("project-123", "community-456"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.status?.status).toBe(KycVerificationStatus.EXPIRED);
        expect(result.current.status?.isExpired).toBe(true);
      });

      it("should return null on a 404", async () => {
        mockApi.get.mockRejectedValue(httpError(404, "not found"));

        const { result } = renderHook(() => useKycStatus("project-123", "community-456"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.status).toBeNull();
        expect(result.current.isError).toBe(false);
      });
    });

    describe("disabled state", () => {
      it("should not fetch when projectUID is undefined", async () => {
        const { result } = renderHook(() => useKycStatus(undefined, "community-456"), { wrapper });

        expect(mockApi.get).not.toHaveBeenCalled();
        expect(result.current.status).toBeUndefined();
      });

      it("should not fetch when communityUID is undefined", async () => {
        const { result } = renderHook(() => useKycStatus("project-123", undefined), { wrapper });

        expect(mockApi.get).not.toHaveBeenCalled();
        expect(result.current.status).toBeUndefined();
      });

      it("should not fetch when enabled is false", async () => {
        const { result } = renderHook(
          () => useKycStatus("project-123", "community-456", { enabled: false }),
          { wrapper }
        );

        expect(mockApi.get).not.toHaveBeenCalled();
        expect(result.current.status).toBeUndefined();
      });
    });

    describe("error handling", () => {
      it("should handle fetch errors", async () => {
        mockApi.get.mockRejectedValue(httpError(500, "API Error"));

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
        mockApi.get.mockResolvedValue(mockConfig);

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
        mockApi.get.mockResolvedValue(mockConfig);

        const { result } = renderHook(() => useKycConfig("optimism"), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isEnabled).toBe(false);
      });

      it("should return null when config does not exist (404)", async () => {
        // Mock a "not found" HttpError — the hook treats this as "not configured yet"
        mockApi.get.mockRejectedValue(httpError(404, "Config not found"));

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

        expect(mockApi.get).not.toHaveBeenCalled();
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
              status: KycVerificationStatus.PENDING,
            }),
            "project-3": null,
          },
        };
        mockApi.post.mockResolvedValue(mockResponse);

        const projectUIDs = ["project-1", "project-2", "project-3"];

        const { result } = renderHook(() => useKycBatchStatuses("community-456", projectUIDs), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.statuses.size).toBe(3);
        expect(result.current.getStatus("project-1")?.status).toBe(KycVerificationStatus.VERIFIED);
        expect(result.current.getStatus("project-2")?.status).toBe(KycVerificationStatus.PENDING);
        expect(result.current.getStatus("project-3")).toBeNull();
      });

      it("should return empty map when projectUIDs is empty", async () => {
        const { result } = renderHook(() => useKycBatchStatuses("community-456", []), { wrapper });

        expect(mockApi.post).not.toHaveBeenCalled();
        expect(result.current.statuses.size).toBe(0);
      });
    });

    describe("disabled state", () => {
      it("should not fetch when communityUID is undefined", async () => {
        const { result } = renderHook(() => useKycBatchStatuses(undefined, ["project-1"]), {
          wrapper,
        });

        expect(mockApi.post).not.toHaveBeenCalled();
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
        mockApi.post.mockResolvedValue(mockResponse);

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
      mockApi.post.mockResolvedValue(mockResponse);

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
      mockApi.post.mockRejectedValue(httpError(500, "Failed to get form URL"));

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
      mockApi.put.mockResolvedValue(mockConfig);

      const { result } = renderHook(() => useSaveKycConfig("optimism"), {
        wrapper,
      });

      let mutationResult: typeof mockConfig | undefined;
      await act(async () => {
        mutationResult = await result.current.mutateAsync({
          providerType: KycProviderType.TREOVA,
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
            providerType: KycProviderType.TREOVA,
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
      mockApi.put.mockResolvedValue(mockConfig);

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useSaveKycConfig("optimism"), {
        wrapper,
      });

      await act(async () => {
        await result.current.mutateAsync({
          providerType: KycProviderType.TREOVA,
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

  describe("useSetKycApplicability", () => {
    const APP_REF = "APP-123";
    const OTHER_REF = "APP-999";
    const statusKey = KYC_QUERY_KEYS.statusByAppRef(APP_REF);
    const batchKey = KYC_QUERY_KEYS.batchStatusesByAppRef("community-456", [APP_REF, OTHER_REF]);

    const notApplicableRequest = {
      applicationReference: APP_REF,
      verificationType: KycVerificationType.KYC,
      status: KycVerificationStatus.NOT_APPLICABLE,
    } as const;

    const seedCaches = () => {
      const notStarted = createMockKycStatus({
        status: KycVerificationStatus.NOT_STARTED,
        verifiedAt: undefined,
        expiresAt: undefined,
      });
      queryClient.setQueryData(statusKey, notStarted);
      const batchMap = new Map<string, KycStatusResponse | null>([
        [APP_REF, notStarted],
        [OTHER_REF, null],
      ]);
      queryClient.setQueryData(batchKey, batchMap);
      return { notStarted, batchMap };
    };

    it("should send the request body to the applicability endpoint", async () => {
      const serverRow = createMockKycStatus({
        status: KycVerificationStatus.NOT_APPLICABLE,
        verifiedAt: undefined,
        expiresAt: undefined,
      });
      mockApi.put.mockResolvedValue(serverRow);

      const { result } = renderHook(() => useSetKycApplicability(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(notApplicableRequest);
      });

      expect(mockApi.put).toHaveBeenCalledWith(INDEXER.KYC.SET_APPLICABILITY, notApplicableRequest);
    });

    it("should optimistically patch statusByAppRef and clone every batch Map, then write the server row", async () => {
      const { batchMap } = seedCaches();
      const serverRow = createMockKycStatus({
        status: KycVerificationStatus.NOT_APPLICABLE,
        verifiedAt: undefined,
        expiresAt: undefined,
        statusSource: "COMMUNITY_ADMIN",
      });
      let resolvePut!: (value: KycStatusResponse) => void;
      mockApi.put.mockImplementation(
        () =>
          new Promise<KycStatusResponse>((resolve) => {
            resolvePut = resolve;
          })
      );

      const { result } = renderHook(() => useSetKycApplicability(), { wrapper });

      act(() => {
        result.current.mutate(notApplicableRequest);
      });

      // Optimistic flip lands before the response resolves
      await waitFor(() => {
        expect(queryClient.getQueryData<KycStatusResponse | null>(statusKey)?.status).toBe(
          KycVerificationStatus.NOT_APPLICABLE
        );
      });

      const optimisticMap =
        queryClient.getQueryData<Map<string, KycStatusResponse | null>>(batchKey);
      // Map must be cloned, not mutated in place
      expect(optimisticMap).not.toBe(batchMap);
      expect(optimisticMap?.get(APP_REF)?.status).toBe(KycVerificationStatus.NOT_APPLICABLE);
      // Untouched entries are preserved
      expect(optimisticMap?.get(OTHER_REF)).toBeNull();

      await act(async () => {
        resolvePut(serverRow);
      });

      // Server row becomes the authoritative cache entry
      await waitFor(() => {
        expect(queryClient.getQueryData(statusKey)).toEqual(serverRow);
      });
      expect(
        queryClient.getQueryData<Map<string, KycStatusResponse | null>>(batchKey)?.get(APP_REF)
      ).toEqual(serverRow);
      expect(mockToast.success).toHaveBeenCalledWith("Marked as Not applicable");
    });

    it("should roll back statusByAppRef and batch Maps on error", async () => {
      const { notStarted, batchMap } = seedCaches();
      mockApi.put.mockRejectedValue(httpError(403, "Forbidden"));

      const { result } = renderHook(() => useSetKycApplicability(), { wrapper });

      act(() => {
        result.current.mutate(notApplicableRequest);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(queryClient.getQueryData(statusKey)).toEqual(notStarted);
      const rolledBackMap =
        queryClient.getQueryData<Map<string, KycStatusResponse | null>>(batchKey);
      expect(rolledBackMap?.get(APP_REF)).toEqual(batchMap.get(APP_REF));
      expect(rolledBackMap?.get(OTHER_REF)).toBeNull();
      expect(mockToast.error).toHaveBeenCalledWith("Forbidden");
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it("should roll back only this application's batch entry, preserving interleaved updates to other entries in the same Map", async () => {
      seedCaches();
      let rejectPut!: (error: Error) => void;
      mockApi.put.mockImplementation(
        () =>
          new Promise<KycStatusResponse>((_, reject) => {
            rejectPut = reject;
          })
      );

      const { result } = renderHook(() => useSetKycApplicability(), { wrapper });

      act(() => {
        result.current.mutate(notApplicableRequest);
      });

      await waitFor(() => {
        expect(
          queryClient.getQueryData<Map<string, KycStatusResponse | null>>(batchKey)?.get(APP_REF)
            ?.status
        ).toBe(KycVerificationStatus.NOT_APPLICABLE);
      });

      // Interleaved update to ANOTHER application sharing the same batch Map
      // (e.g. a second admin toggle) lands while this mutation is in flight
      const otherUpdated = createMockKycStatus({
        status: KycVerificationStatus.NOT_APPLICABLE,
        verifiedAt: undefined,
        expiresAt: undefined,
      });
      queryClient.setQueryData<Map<string, KycStatusResponse | null>>(batchKey, (old) => {
        const next = new Map(old);
        next.set(OTHER_REF, otherUpdated);
        return next;
      });

      await act(async () => {
        rejectPut(httpError(500, "Internal error"));
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const rolledBackMap =
        queryClient.getQueryData<Map<string, KycStatusResponse | null>>(batchKey);
      // This application's entry snaps back to its pre-mutation value...
      expect(rolledBackMap?.get(APP_REF)?.status).toBe(KycVerificationStatus.NOT_STARTED);
      // ...but the interleaved update to the other application survives
      expect(rolledBackMap?.get(OTHER_REF)).toEqual(otherUpdated);
    });

    it("should remove the synthetic statusByAppRef entry on error when no cache entry existed before", async () => {
      // No seedCaches() — the statusByAppRef cache starts empty
      mockApi.put.mockRejectedValue(httpError(403, "Forbidden"));

      const { result } = renderHook(() => useSetKycApplicability(), { wrapper });

      act(() => {
        result.current.mutate(notApplicableRequest);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Rollback must not fabricate a "no KYC row" (null) cache entry for a
      // query that never ran — the entry created by onMutate is removed
      expect(queryClient.getQueryState(statusKey)).toBeUndefined();
    });

    it("should invalidate all KYC queries on settle", async () => {
      seedCaches();
      const serverRow = createMockKycStatus({
        status: KycVerificationStatus.NOT_APPLICABLE,
        verifiedAt: undefined,
        expiresAt: undefined,
      });
      mockApi.put.mockResolvedValue(serverRow);
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useSetKycApplicability(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(notApplicableRequest);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: KYC_QUERY_KEYS.all });
    });

    it("should toast the reset message when undoing back to Not started", async () => {
      const serverRow = createMockKycStatus({
        status: KycVerificationStatus.NOT_STARTED,
        verifiedAt: undefined,
        expiresAt: undefined,
      });
      mockApi.put.mockResolvedValue(serverRow);

      const { result } = renderHook(() => useSetKycApplicability(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          applicationReference: APP_REF,
          verificationType: KycVerificationType.KYB,
          status: KycVerificationStatus.NOT_STARTED,
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith("Reset to Not started");
    });
  });

  describe("KYC_QUERY_KEYS", () => {
    it("should generate correct status query key", () => {
      const key = KYC_QUERY_KEYS.status("project-123", "community-456");
      expect(key).toEqual(["kyc", "status", "community-456", "project-123"]);
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
