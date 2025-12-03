import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { contractsService } from "@/services/contracts.service";
import { useDeployerLookup } from "../useDeployerLookup";

// Mock the contracts service
jest.mock("@/services/contracts.service", () => ({
  contractsService: {
    lookupDeployer: jest.fn(),
  },
}));

const mockLookupDeployer = contractsService.lookupDeployer as jest.MockedFunction<
  typeof contractsService.lookupDeployer
>;

describe("useDeployerLookup", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
      logger: {
        log: console.log,
        warn: console.warn,
        error: () => {}, // Suppress error logs in tests
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Initial State", () => {
    it("should initialize with null data, loading false, and no error when disabled", () => {
      const { result } = renderHook(
        () =>
          useDeployerLookup({
            network: "ethereum",
            contractAddress: "0xContract123",
            enabled: false,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Successful Lookup", () => {
    it("should fetch deployer info successfully when enabled", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockLookupDeployer.mockResolvedValueOnce(mockDeployerData);

      const { result } = renderHook(
        () =>
          useDeployerLookup({
            network: "ethereum",
            contractAddress: "0xContract123",
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toEqual(mockDeployerData);
      expect(result.current.error).toBeNull();
      expect(mockLookupDeployer).toHaveBeenCalledWith("ethereum", "0xContract123");
    });

    it("should be loading during fetch", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockLookupDeployer.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockDeployerData), 100);
          })
      );

      const { result } = renderHook(
        () =>
          useDeployerLookup({
            network: "ethereum",
            contractAddress: "0xContract123",
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toEqual(mockDeployerData);
    });
  });

  describe("Error Handling", () => {
    it("should handle service errors", async () => {
      const errorMessage =
        "Contract not found on ethereum. Please verify the contract address and network are correct.";
      mockLookupDeployer.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(
        () =>
          useDeployerLookup({
            network: "ethereum",
            contractAddress: "0xNonExistent",
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });

    it("should handle network errors", async () => {
      mockLookupDeployer.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(
        () =>
          useDeployerLookup({
            network: "ethereum",
            contractAddress: "0xContract123",
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(result.current.error).toBe("Network error");
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe("Query Enabling", () => {
    it("should not fetch when enabled is false", async () => {
      const { result } = renderHook(
        () =>
          useDeployerLookup({
            network: "ethereum",
            contractAddress: "0xContract123",
            enabled: false,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 100 });

      expect(mockLookupDeployer).not.toHaveBeenCalled();
      expect(result.current.data).toBeNull();
    });

    it("should not fetch when network is empty", async () => {
      const { result } = renderHook(
        () => useDeployerLookup({ network: "", contractAddress: "0xContract123", enabled: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 100 });

      expect(mockLookupDeployer).not.toHaveBeenCalled();
    });

    it("should not fetch when contractAddress is empty", async () => {
      const { result } = renderHook(
        () => useDeployerLookup({ network: "ethereum", contractAddress: "", enabled: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 100 });

      expect(mockLookupDeployer).not.toHaveBeenCalled();
    });
  });

  describe("Refetch", () => {
    it("should allow manual refetch", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockLookupDeployer.mockResolvedValue(mockDeployerData);

      const { result } = renderHook(
        () =>
          useDeployerLookup({
            network: "ethereum",
            contractAddress: "0xContract123",
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockLookupDeployer).toHaveBeenCalledTimes(1);

      // Manually refetch
      result.current.refetch();

      await waitFor(() => expect(mockLookupDeployer).toHaveBeenCalledTimes(2));
    });
  });

  describe("Caching", () => {
    it("should use cached data for the same query", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockLookupDeployer.mockResolvedValue(mockDeployerData);

      const { result: result1 } = renderHook(
        () =>
          useDeployerLookup({
            network: "ethereum",
            contractAddress: "0xContract123",
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result1.current.loading).toBe(false));

      // Second hook with same parameters should use cache
      const { result: result2 } = renderHook(
        () =>
          useDeployerLookup({
            network: "ethereum",
            contractAddress: "0xContract123",
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      // Should immediately have data from cache
      expect(result2.current.data).toEqual(mockDeployerData);

      // Service should only be called once (cached)
      await waitFor(() => expect(mockLookupDeployer).toHaveBeenCalledTimes(1));
    });
  });
});
