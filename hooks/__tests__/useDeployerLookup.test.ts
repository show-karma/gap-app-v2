import { act, renderHook, waitFor } from "@testing-library/react";
import fetchData from "@/utilities/fetchData";
import { useDeployerLookup } from "../useDeployerLookup";

// Mock fetchData
jest.mock("@/utilities/fetchData");
const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

describe("useDeployerLookup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with null data, loading false, and no error", () => {
      const { result } = renderHook(() => useDeployerLookup());

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Successful Lookup", () => {
    it("should fetch deployer info successfully", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockFetchData.mockResolvedValueOnce([mockDeployerData, null]);

      const { result } = renderHook(() => useDeployerLookup());

      let deployerInfo: any;

      await act(async () => {
        deployerInfo = await result.current.lookupDeployer("ethereum", "0xContract123");
      });

      expect(result.current.data).toEqual(mockDeployerData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(deployerInfo).toEqual(mockDeployerData);
    });

    it("should set loading to true during fetch", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetchData.mockReturnValueOnce(promise as any);

      const { result } = renderHook(() => useDeployerLookup());

      act(() => {
        result.current.lookupDeployer("ethereum", "0xContract123");
      });

      // Should be loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      // Resolve the promise
      await act(async () => {
        resolvePromise!([mockDeployerData, null]);
      });

      // Should be done loading
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(mockDeployerData);
    });

    it("should clear previous error on new successful lookup", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      // First call fails
      mockFetchData.mockResolvedValueOnce([null, "Contract not found on ethereum"]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xWrong");
      });

      expect(result.current.error).toBeTruthy();

      // Second call succeeds
      mockFetchData.mockResolvedValueOnce([mockDeployerData, null]);

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xCorrect");
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual(mockDeployerData);
    });
  });

  describe("Error Handling", () => {
    it("should handle 'not found' error", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Contract not found on ethereum"]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        const deployerInfo = await result.current.lookupDeployer("ethereum", "0xNonExistent");
        expect(deployerInfo).toBeNull();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toContain("Contract not found on ethereum");
      expect(result.current.error).toContain("verify the contract address");
    });

    it("should handle 'unsupported network' error", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Network unsupported for deployer lookup"]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("unknownchain", "0xContract");
      });

      expect(result.current.error).toContain("not currently supported");
      expect(result.current.error).toContain("contact support");
    });

    it("should handle 'rate limit' error", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Too many requests - rate limit exceeded"]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xContract");
      });

      expect(result.current.error).toContain("Too many requests");
      expect(result.current.error).toContain("wait a moment");
    });

    it("should handle generic error from fetchData", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Something went wrong on the server"]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xContract");
      });

      expect(result.current.error).toBe("Something went wrong on the server");
    });

    it("should handle no response from fetchData", async () => {
      mockFetchData.mockResolvedValueOnce([null, null]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xContract");
      });

      expect(result.current.error).toContain("Failed to lookup contract deployer");
    });

    it("should handle thrown exception", async () => {
      const error = new Error("Network error");
      mockFetchData.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xContract");
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should handle error without message property", async () => {
      mockFetchData.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xContract");
      });

      expect(result.current.error).toBe("String error");
    });
  });

  describe("State Management", () => {
    it("should reset data and error when starting new lookup", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      // First successful lookup
      mockFetchData.mockResolvedValueOnce([mockDeployerData, null]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xContract1");
      });

      expect(result.current.data).toEqual(mockDeployerData);

      // Start second lookup
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetchData.mockReturnValueOnce(promise as any);

      act(() => {
        result.current.lookupDeployer("optimism", "0xContract2");
      });

      // Data should be cleared, loading should be true
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("should handle multiple consecutive lookups", async () => {
      const mockData1 = {
        deployerAddress: "0xDeployer1",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTx1",
      };

      const mockData2 = {
        deployerAddress: "0xDeployer2",
        createdAt: "2024-01-02T00:00:00Z",
        txHash: "0xTx2",
      };

      mockFetchData
        .mockResolvedValueOnce([mockData1, null])
        .mockResolvedValueOnce([mockData2, null]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xContract1");
      });

      expect(result.current.data).toEqual(mockData1);

      await act(async () => {
        await result.current.lookupDeployer("optimism", "0xContract2");
      });

      expect(result.current.data).toEqual(mockData2);
    });
  });

  describe("Return Value", () => {
    it("should return DeployerInfo on success", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockFetchData.mockResolvedValueOnce([mockDeployerData, null]);

      const { result } = renderHook(() => useDeployerLookup());

      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.lookupDeployer("ethereum", "0xContract");
      });

      expect(returnValue).toEqual(mockDeployerData);
    });

    it("should return null on error", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Error occurred"]);

      const { result } = renderHook(() => useDeployerLookup());

      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.lookupDeployer("ethereum", "0xContract");
      });

      expect(returnValue).toBeNull();
    });
  });

  describe("API Integration", () => {
    it("should call fetchData with correct URL", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockFetchData.mockResolvedValueOnce([mockDeployerData, null]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", "0xContract123");
      });

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("/v2/projects/contracts/deployer")
      );
      expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("network=ethereum"));
      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("contractAddress=0xContract123")
      );
    });

    it("should encode URL parameters correctly", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockFetchData.mockResolvedValueOnce([mockDeployerData, null]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum mainnet", "0xContract With Space");
      });

      const callArgs = mockFetchData.mock.calls[0][0];
      expect(callArgs).toContain("network=ethereum%20mainnet");
      expect(callArgs).toContain("contractAddress=0xContract%20With%20Space");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty network and address", async () => {
      mockFetchData.mockResolvedValueOnce([null, "Invalid parameters"]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("", "");
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should handle very long contract addresses", async () => {
      const longAddress = "0x" + "a".repeat(1000);
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockFetchData.mockResolvedValueOnce([mockDeployerData, null]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum", longAddress);
      });

      expect(result.current.data).toEqual(mockDeployerData);
    });

    it("should handle special characters in parameters", async () => {
      const mockDeployerData = {
        deployerAddress: "0xDeployer123",
        createdAt: "2024-01-01T00:00:00Z",
        txHash: "0xTxHash123",
      };

      mockFetchData.mockResolvedValueOnce([mockDeployerData, null]);

      const { result } = renderHook(() => useDeployerLookup());

      await act(async () => {
        await result.current.lookupDeployer("ethereum&test=1", "0x123&foo=bar");
      });

      expect(mockFetchData).toHaveBeenCalled();
    });
  });
});
