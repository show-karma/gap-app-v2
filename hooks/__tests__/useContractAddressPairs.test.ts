import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { act, renderHook } from "@testing-library/react";
import { useContractAddressPairs } from "../useContractAddressPairs";

describe("useContractAddressPairs", () => {
  const createMockProject = (
    networkAddresses: string[] = [],
    networkAddressesVerified: any[] = []
  ): any => ({
    uid: "test-project-uid",
    external: {
      network_addresses: networkAddresses,
      network_addresses_verified: networkAddressesVerified,
    },
  });

  describe("Initialization", () => {
    it("should initialize with empty pair when no addresses exist", () => {
      const project = createMockProject();
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toEqual([{ network: "", address: "", verified: false }]);
    });

    it("should initialize from network_addresses", () => {
      const project = createMockProject(["ethereum:0x123", "optimism:0x456"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toEqual([
        { network: "ethereum", address: "0x123", verified: false },
        { network: "optimism", address: "0x456", verified: false },
      ]);
    });

    it("should initialize with verification status from network_addresses_verified", () => {
      const project = createMockProject(
        ["ethereum:0x123"],
        [
          {
            network: "ethereum",
            address: "0x123",
            verified: true,
            verifiedAt: "2024-01-01T00:00:00Z",
            verifiedBy: "0xVerifier",
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toEqual([
        {
          network: "ethereum",
          address: "0x123",
          verified: true,
          verifiedAt: "2024-01-01T00:00:00Z",
          verifiedBy: "0xVerifier",
        },
      ]);
    });
  });

  describe("Dual-Source Merging", () => {
    it("should merge network_addresses with network_addresses_verified", () => {
      const project = createMockProject(
        ["ethereum:0x123", "optimism:0x456"],
        [
          {
            network: "ethereum",
            address: "0x123",
            verified: true,
            verifiedAt: "2024-01-01",
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toEqual([
        {
          network: "ethereum",
          address: "0x123",
          verified: true,
          verifiedAt: "2024-01-01",
        },
        {
          network: "optimism",
          address: "0x456",
          verified: false,
        },
      ]);
    });

    it("should include verified contracts not in network_addresses", () => {
      const project = createMockProject(
        ["ethereum:0x123"],
        [
          {
            network: "optimism",
            address: "0x456",
            verified: true,
            verifiedAt: "2024-01-01",
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toHaveLength(2);
      expect(result.current.pairs).toContainEqual({
        network: "ethereum",
        address: "0x123",
        verified: false,
      });
      expect(result.current.pairs).toContainEqual({
        network: "optimism",
        address: "0x456",
        verified: true,
        verifiedAt: "2024-01-01",
      });
    });

    it("should handle only verified contracts (no network_addresses)", () => {
      const project = createMockProject(
        [],
        [
          {
            network: "ethereum",
            address: "0x123",
            verified: true,
            verifiedAt: "2024-01-01",
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toEqual([
        {
          network: "ethereum",
          address: "0x123",
          verified: true,
          verifiedAt: "2024-01-01",
        },
      ]);
    });
  });

  describe("Case-Insensitive Key Generation", () => {
    it("should match contracts case-insensitively", () => {
      const project = createMockProject(
        ["ETHEREUM:0xABC123"],
        [
          {
            network: "ethereum",
            address: "0xabc123",
            verified: true,
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toHaveLength(1);
      expect(result.current.pairs[0]).toEqual({
        network: "ETHEREUM",
        address: "0xABC123",
        verified: true,
      });
    });

    it("should not create duplicates for case variants", () => {
      const project = createMockProject(
        ["ethereum:0xABC", "ETHEREUM:0xabc"],
        [
          {
            network: "Ethereum",
            address: "0xAbC",
            verified: true,
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      // Should have 2 entries from network_addresses
      expect(result.current.pairs).toHaveLength(2);
      // First one should be verified (matched)
      expect(result.current.pairs[0].verified).toBe(true);
      // Second one should also be verified (matched due to case-insensitive key)
      expect(result.current.pairs[1].verified).toBe(true);
    });
  });

  describe("Duplicate Handling", () => {
    it("should not duplicate verified-only contracts", () => {
      const project = createMockProject(
        ["ethereum:0x123"],
        [
          {
            network: "ethereum",
            address: "0x123",
            verified: true,
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toHaveLength(1);
    });

    it("should add verified contract only if not in network_addresses", () => {
      const project = createMockProject(
        ["ethereum:0x111"],
        [
          {
            network: "ethereum",
            address: "0x111",
            verified: true,
          },
          {
            network: "optimism",
            address: "0x222",
            verified: true,
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toHaveLength(2);
      const addresses = result.current.pairs.map((p) => p.address);
      expect(addresses).toContain("0x111");
      expect(addresses).toContain("0x222");
    });
  });

  describe("Add Pair", () => {
    it("should add empty pair", () => {
      const project = createMockProject(["ethereum:0x123"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.addPair();
      });

      expect(result.current.pairs).toHaveLength(2);
      expect(result.current.pairs[1]).toEqual({
        network: "",
        address: "",
        verified: false,
      });
    });

    it("should add multiple pairs", () => {
      const project = createMockProject();
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.addPair();
        result.current.addPair();
      });

      expect(result.current.pairs).toHaveLength(3);
    });
  });

  describe("Remove Pair", () => {
    it("should remove pair at index", () => {
      const project = createMockProject(["ethereum:0x123", "optimism:0x456"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.removePair(0);
      });

      expect(result.current.pairs).toHaveLength(1);
      expect(result.current.pairs[0].network).toBe("optimism");
    });

    it("should maintain at least one empty pair when removing last", () => {
      const project = createMockProject(["ethereum:0x123"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.removePair(0);
      });

      expect(result.current.pairs).toEqual([{ network: "", address: "", verified: false }]);
    });

    it("should handle removing from multiple pairs", () => {
      const project = createMockProject(["ethereum:0x111", "optimism:0x222", "arbitrum:0x333"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.removePair(1);
      });

      expect(result.current.pairs).toHaveLength(2);
      expect(result.current.pairs[0].network).toBe("ethereum");
      expect(result.current.pairs[1].network).toBe("arbitrum");
    });
  });

  describe("Update Address", () => {
    it("should update address at index", () => {
      const project = createMockProject(["ethereum:0x123"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.updateAddress(0, "0x456");
      });

      expect(result.current.pairs[0].address).toBe("0x456");
      expect(result.current.pairs[0].network).toBe("ethereum");
    });

    it("should preserve other properties when updating address", () => {
      const project = createMockProject(
        ["ethereum:0x123"],
        [{ network: "ethereum", address: "0x123", verified: true }]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.updateAddress(0, "0x456");
      });

      expect(result.current.pairs[0]).toMatchObject({
        network: "ethereum",
        address: "0x456",
        verified: true,
      });
    });
  });

  describe("Update Network", () => {
    it("should update network at index", () => {
      const project = createMockProject(["ethereum:0x123"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.updateNetwork(0, "optimism");
      });

      expect(result.current.pairs[0].network).toBe("optimism");
      expect(result.current.pairs[0].address).toBe("0x123");
    });

    it("should preserve other properties when updating network", () => {
      const project = createMockProject(
        ["ethereum:0x123"],
        [{ network: "ethereum", address: "0x123", verified: true }]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.updateNetwork(0, "optimism");
      });

      expect(result.current.pairs[0]).toMatchObject({
        network: "optimism",
        address: "0x123",
        verified: true,
      });
    });
  });

  describe("Set Pairs", () => {
    it("should allow setting pairs directly", () => {
      const project = createMockProject();
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      const newPairs = [
        { network: "ethereum", address: "0x111", verified: false },
        { network: "optimism", address: "0x222", verified: true },
      ];

      act(() => {
        result.current.setPairs(newPairs);
      });

      expect(result.current.pairs).toEqual(newPairs);
    });
  });

  describe("Re-initialization on Project Change", () => {
    it("should update pairs when project data changes", () => {
      const project1 = createMockProject(["ethereum:0x123"]);
      const { result, rerender } = renderHook(
        ({ project }) => useContractAddressPairs({ project }),
        { initialProps: { project: project1 } }
      );

      expect(result.current.pairs).toHaveLength(1);

      const project2 = createMockProject(["ethereum:0x123", "optimism:0x456"]);
      rerender({ project: project2 });

      expect(result.current.pairs).toHaveLength(2);
    });

    it("should update verification status when verified contracts change", () => {
      const project1 = createMockProject(["ethereum:0x123"]);
      const { result, rerender } = renderHook(
        ({ project }) => useContractAddressPairs({ project }),
        { initialProps: { project: project1 } }
      );

      expect(result.current.pairs[0].verified).toBe(false);

      const project2 = createMockProject(
        ["ethereum:0x123"],
        [{ network: "ethereum", address: "0x123", verified: true }]
      );
      rerender({ project: project2 });

      expect(result.current.pairs[0].verified).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle malformed network_addresses entries", () => {
      const project = createMockProject(["invalidformat"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toHaveLength(1);
      expect(result.current.pairs[0].network).toBe("invalidformat");
      expect(result.current.pairs[0].address).toBeUndefined();
    });

    it("should handle verified contracts with missing fields", () => {
      const project = createMockProject(
        [],
        [
          {
            network: "ethereum",
            address: "0x123",
            verified: true,
            // missing verifiedAt and verifiedBy
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs[0]).toEqual({
        network: "ethereum",
        address: "0x123",
        verified: true,
      });
    });

    it("should handle verified=false in network_addresses_verified", () => {
      const project = createMockProject(
        ["ethereum:0x123"],
        [
          {
            network: "ethereum",
            address: "0x123",
            verified: false,
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs[0].verified).toBe(false);
    });
  });
});
