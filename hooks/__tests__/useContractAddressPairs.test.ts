import { act, renderHook } from "@testing-library/react";
import { useContractAddressPairs } from "../useContractAddressPairs";

describe("useContractAddressPairs - User Workflows", () => {
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

  describe("User opens Link Contracts dialog", () => {
    it("should show empty input when project has no contracts", () => {
      const project = createMockProject();
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toEqual([{ network: "", address: "", verified: false }]);
    });

    it("should show existing contracts when project has contracts", () => {
      const project = createMockProject(["ethereum:0x123", "optimism:0x456"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toHaveLength(2);
      expect(result.current.pairs[0]).toMatchObject({
        network: "ethereum",
        address: "0x123",
      });
      expect(result.current.pairs[1]).toMatchObject({
        network: "optimism",
        address: "0x456",
      });
    });

    it("should show verified badges for verified contracts", () => {
      const project = createMockProject(
        ["ethereum:0x123"],
        [
          {
            network: "ethereum",
            address: "0x123",
            verified: true,
            verifiedAt: "2024-01-01T00:00:00Z",
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs[0]).toMatchObject({
        network: "ethereum",
        address: "0x123",
        verified: true,
        verifiedAt: "2024-01-01T00:00:00Z",
      });
    });
  });

  describe("User adds a new contract", () => {
    it("should add empty pair when user clicks Add Contract button", () => {
      const project = createMockProject(["ethereum:0x123"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toHaveLength(1);

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

    it("should allow adding multiple contracts", () => {
      const project = createMockProject();
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.addPair();
        result.current.addPair();
      });

      expect(result.current.pairs).toHaveLength(3);
    });
  });

  describe("User removes a contract", () => {
    it("should remove contract when user clicks remove button", () => {
      const project = createMockProject(["ethereum:0x123", "optimism:0x456"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toHaveLength(2);

      act(() => {
        result.current.removePair(0);
      });

      expect(result.current.pairs).toHaveLength(1);
      expect(result.current.pairs[0].network).toBe("optimism");
    });

    it("should keep at least one empty field when removing last contract", () => {
      const project = createMockProject(["ethereum:0x123"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.removePair(0);
      });

      expect(result.current.pairs).toEqual([{ network: "", address: "", verified: false }]);
    });
  });

  describe("User types in network/address fields", () => {
    it("should update address when user types", () => {
      const project = createMockProject(["ethereum:0x123"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.updateAddress(0, "0x456");
      });

      expect(result.current.pairs[0].address).toBe("0x456");
      expect(result.current.pairs[0].network).toBe("ethereum");
    });

    it("should update network when user selects from dropdown", () => {
      const project = createMockProject(["ethereum:0x123"]);
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      act(() => {
        result.current.updateNetwork(0, "optimism");
      });

      expect(result.current.pairs[0].network).toBe("optimism");
      expect(result.current.pairs[0].address).toBe("0x123");
    });
  });

  describe("Contract verification updates", () => {
    it("should show verified contract even if user hasn't saved it yet", () => {
      // User verified a contract in the dialog, but hasn't hit Save All yet
      // The contract should appear in the list as verified
      const project = createMockProject(
        [], // Not in network_addresses yet
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

      expect(result.current.pairs).toHaveLength(1);
      expect(result.current.pairs[0]).toMatchObject({
        network: "ethereum",
        address: "0x123",
        verified: true,
      });
    });

    it("should update verified status when user verifies a contract", () => {
      const project1 = createMockProject(["ethereum:0x123"]);
      const { result, rerender } = renderHook(
        ({ project }) => useContractAddressPairs({ project }),
        { initialProps: { project: project1 } }
      );

      expect(result.current.pairs[0].verified).toBe(false);

      // User clicks Verify and successfully verifies the contract
      const project2 = createMockProject(
        ["ethereum:0x123"],
        [{ network: "ethereum", address: "0x123", verified: true }]
      );
      rerender({ project: project2 });

      expect(result.current.pairs[0].verified).toBe(true);
    });
  });

  describe("Case sensitivity issues (common user error)", () => {
    it("should match contracts regardless of address case", () => {
      // User might paste addresses in different cases
      // System should recognize them as the same contract
      const project = createMockProject(
        ["ethereum:0xABC123"], // Uppercase in network_addresses
        [
          {
            network: "ethereum",
            address: "0xabc123", // Lowercase in verified
            verified: true,
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      expect(result.current.pairs).toHaveLength(1);
      expect(result.current.pairs[0].verified).toBe(true);
    });

    it("should not create duplicate entries for case variants", () => {
      // Bug scenario: system creates two entries for same contract
      const project = createMockProject(
        ["ethereum:0xABC", "ETHEREUM:0xabc"], // Same contract, different case
        [
          {
            network: "Ethereum",
            address: "0xAbC",
            verified: true,
          },
        ]
      );
      const { result } = renderHook(() => useContractAddressPairs({ project }));

      // Should have 2 entries (from network_addresses), both marked as verified
      expect(result.current.pairs).toHaveLength(2);
      expect(result.current.pairs[0].verified).toBe(true);
      expect(result.current.pairs[1].verified).toBe(true);
    });
  });
});
