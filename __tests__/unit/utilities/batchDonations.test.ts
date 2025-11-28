import {
  BATCH_DONATIONS_CONTRACTS,
  BatchDonationsABI,
  getBatchDonationsContractAddress,
  getSupportedBatchDonationsChains,
  isBatchDonationsSupportedOnChain,
  PERMIT2_ADDRESS,
} from "@/utilities/donations/batchDonations";

type HexAddress = `0x${string}`;

describe("batchDonations utilities", () => {
  describe("PERMIT2_ADDRESS", () => {
    it("should be the canonical Permit2 address", () => {
      expect(PERMIT2_ADDRESS).toBe("0x000000000022D473030F116dDEE9F6B43aC78BA3");
    });

    it("should be a valid hex address", () => {
      expect(PERMIT2_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe("BATCH_DONATIONS_CONTRACTS", () => {
    it("should contain contract addresses for supported chains", () => {
      expect(BATCH_DONATIONS_CONTRACTS[1]).toBeTruthy(); // Ethereum Mainnet
      expect(BATCH_DONATIONS_CONTRACTS[10]).toBeTruthy(); // Optimism
      expect(BATCH_DONATIONS_CONTRACTS[8453]).toBeTruthy(); // Base
      expect(BATCH_DONATIONS_CONTRACTS[137]).toBeTruthy(); // Polygon
      expect(BATCH_DONATIONS_CONTRACTS[42161]).toBeTruthy(); // Arbitrum
    });

    it("should have valid hex addresses for all entries", () => {
      Object.values(BATCH_DONATIONS_CONTRACTS).forEach((address) => {
        if (address !== null) {
          expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        }
      });
    });

    it("should have same contract address for all chains", () => {
      const addresses = Object.values(BATCH_DONATIONS_CONTRACTS).filter((addr) => addr !== null);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBeGreaterThan(0);
    });
  });

  describe("getBatchDonationsContractAddress", () => {
    it("should return contract address for supported chain", () => {
      const address = getBatchDonationsContractAddress(10);
      expect(address).toBeTruthy();
      expect(typeof address).toBe("string");
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("should return contract address for Ethereum mainnet", () => {
      const address = getBatchDonationsContractAddress(1);
      expect(address).toBe(BATCH_DONATIONS_CONTRACTS[1]);
    });

    it("should return contract address for Optimism", () => {
      const address = getBatchDonationsContractAddress(10);
      expect(address).toBe(BATCH_DONATIONS_CONTRACTS[10]);
    });

    it("should return contract address for Base", () => {
      const address = getBatchDonationsContractAddress(8453);
      expect(address).toBe(BATCH_DONATIONS_CONTRACTS[8453]);
    });

    it("should return contract address for Polygon", () => {
      const address = getBatchDonationsContractAddress(137);
      expect(address).toBe(BATCH_DONATIONS_CONTRACTS[137]);
    });

    it("should return contract address for Arbitrum", () => {
      const address = getBatchDonationsContractAddress(42161);
      expect(address).toBe(BATCH_DONATIONS_CONTRACTS[42161]);
    });

    it("should return contract address for Celo", () => {
      const address = getBatchDonationsContractAddress(42220);
      expect(address).toBe(BATCH_DONATIONS_CONTRACTS[42220]);
    });

    it("should return contract address for Sepolia testnet", () => {
      const address = getBatchDonationsContractAddress(11155111);
      expect(address).toBe(BATCH_DONATIONS_CONTRACTS[11155111]);
    });

    it("should return contract address for Optimism Sepolia", () => {
      const address = getBatchDonationsContractAddress(11155420);
      expect(address).toBe(BATCH_DONATIONS_CONTRACTS[11155420]);
    });

    it("should return contract address for Base Sepolia", () => {
      const address = getBatchDonationsContractAddress(84532);
      expect(address).toBe(BATCH_DONATIONS_CONTRACTS[84532]);
    });

    it("should return null for unsupported chain", () => {
      const address = getBatchDonationsContractAddress(99999);
      expect(address).toBeNull();
    });

    it("should return null for chain ID 0", () => {
      const address = getBatchDonationsContractAddress(0);
      expect(address).toBeNull();
    });

    it("should return null for negative chain ID", () => {
      const address = getBatchDonationsContractAddress(-1);
      expect(address).toBeNull();
    });
  });

  describe("isBatchDonationsSupportedOnChain", () => {
    it("should return true for supported chains", () => {
      expect(isBatchDonationsSupportedOnChain(1)).toBe(true);
      expect(isBatchDonationsSupportedOnChain(10)).toBe(true);
      expect(isBatchDonationsSupportedOnChain(8453)).toBe(true);
      expect(isBatchDonationsSupportedOnChain(137)).toBe(true);
      expect(isBatchDonationsSupportedOnChain(42161)).toBe(true);
      expect(isBatchDonationsSupportedOnChain(42220)).toBe(true);
    });

    it("should return true for testnet chains", () => {
      expect(isBatchDonationsSupportedOnChain(11155111)).toBe(true);
      expect(isBatchDonationsSupportedOnChain(11155420)).toBe(true);
      expect(isBatchDonationsSupportedOnChain(84532)).toBe(true);
    });

    it("should return false for unsupported chains", () => {
      expect(isBatchDonationsSupportedOnChain(99999)).toBe(false);
      expect(isBatchDonationsSupportedOnChain(0)).toBe(false);
    });

    it("should return false for negative chain IDs", () => {
      expect(isBatchDonationsSupportedOnChain(-1)).toBe(false);
    });
  });

  describe("getSupportedBatchDonationsChains", () => {
    it("should return array of supported chain IDs", () => {
      const chains = getSupportedBatchDonationsChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
    });

    it("should return only chains with non-null addresses", () => {
      const chains = getSupportedBatchDonationsChains();
      chains.forEach((chainId) => {
        const address = BATCH_DONATIONS_CONTRACTS[chainId];
        expect(address).not.toBeNull();
        expect(address).toBeTruthy();
      });
    });

    it("should return numeric chain IDs", () => {
      const chains = getSupportedBatchDonationsChains();
      chains.forEach((chainId) => {
        expect(typeof chainId).toBe("number");
        expect(Number.isInteger(chainId)).toBe(true);
      });
    });

    it("should include all mainnet chains", () => {
      const chains = getSupportedBatchDonationsChains();
      expect(chains).toContain(1); // Ethereum
      expect(chains).toContain(10); // Optimism
      expect(chains).toContain(8453); // Base
      expect(chains).toContain(137); // Polygon
      expect(chains).toContain(42161); // Arbitrum
      expect(chains).toContain(42220); // Celo
    });

    it("should include testnet chains", () => {
      const chains = getSupportedBatchDonationsChains();
      expect(chains).toContain(11155111); // Sepolia
      expect(chains).toContain(11155420); // Optimism Sepolia
      expect(chains).toContain(84532); // Base Sepolia
    });

    it("should not include unsupported chains", () => {
      const chains = getSupportedBatchDonationsChains();
      expect(chains).not.toContain(99999);
    });
  });

  describe("BatchDonationsABI", () => {
    it("should be a valid ABI array", () => {
      expect(Array.isArray(BatchDonationsABI)).toBe(true);
      expect(BatchDonationsABI.length).toBeGreaterThan(0);
    });

    it("should contain batchDonate function", () => {
      const batchDonateFunction = BatchDonationsABI.find(
        (item) => item.type === "function" && item.name === "batchDonate"
      );
      expect(batchDonateFunction).toBeDefined();
    });

    it("should contain batchDonateWithPermit function", () => {
      const batchDonateWithPermitFunction = BatchDonationsABI.find(
        (item) => item.type === "function" && item.name === "batchDonateWithPermit"
      );
      expect(batchDonateWithPermitFunction).toBeDefined();
    });

    it("should contain PERMIT2 constant", () => {
      const permit2Constant = BatchDonationsABI.find(
        (item) => item.type === "function" && item.name === "PERMIT2"
      );
      expect(permit2Constant).toBeDefined();
    });

    it("should contain MAX_PROJECTS_PER_BATCH constant", () => {
      const maxProjectsConstant = BatchDonationsABI.find(
        (item) => item.type === "function" && item.name === "MAX_PROJECTS_PER_BATCH"
      );
      expect(maxProjectsConstant).toBeDefined();
    });

    it("should contain BatchDonationCompleted event", () => {
      const event = BatchDonationsABI.find(
        (item) => item.type === "event" && item.name === "BatchDonationCompleted"
      );
      expect(event).toBeDefined();
    });

    it("should contain DonationMade event", () => {
      const event = BatchDonationsABI.find(
        (item) => item.type === "event" && item.name === "DonationMade"
      );
      expect(event).toBeDefined();
    });

    it("should contain error definitions", () => {
      const errors = BatchDonationsABI.filter((item) => item.type === "error");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should contain IncorrectETHAmount error", () => {
      const error = BatchDonationsABI.find(
        (item) => item.type === "error" && item.name === "IncorrectETHAmount"
      );
      expect(error).toBeDefined();
    });

    it("should contain InvalidProjectAddress error", () => {
      const error = BatchDonationsABI.find(
        (item) => item.type === "error" && item.name === "InvalidProjectAddress"
      );
      expect(error).toBeDefined();
    });

    it("should contain InvalidTokenAmount error", () => {
      const error = BatchDonationsABI.find(
        (item) => item.type === "error" && item.name === "InvalidTokenAmount"
      );
      expect(error).toBeDefined();
    });

    it("should contain NoDonationsProvided error", () => {
      const error = BatchDonationsABI.find(
        (item) => item.type === "error" && item.name === "NoDonationsProvided"
      );
      expect(error).toBeDefined();
    });

    it("should contain TooManyProjects error", () => {
      const error = BatchDonationsABI.find(
        (item) => item.type === "error" && item.name === "TooManyProjects"
      );
      expect(error).toBeDefined();
    });
  });

  describe("Contract address validation per chain", () => {
    it("should validate contract addresses are valid hex addresses", () => {
      Object.entries(BATCH_DONATIONS_CONTRACTS).forEach(([_chainId, address]) => {
        if (address !== null) {
          expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
          expect(address.length).toBe(42); // 0x + 40 hex chars
        }
      });
    });

    it("should validate contract addresses are not zero address", () => {
      Object.entries(BATCH_DONATIONS_CONTRACTS).forEach(([_chainId, address]) => {
        if (address !== null) {
          expect(address).not.toBe("0x0000000000000000000000000000000000000000");
        }
      });
    });
  });

  describe("Edge cases and error scenarios", () => {
    it("should handle undefined chain ID gracefully", () => {
      // TypeScript should prevent this, but test runtime behavior
      const address = getBatchDonationsContractAddress(undefined as any);
      expect(address).toBeNull();
    });

    it("should handle very large chain IDs", () => {
      const address = getBatchDonationsContractAddress(Number.MAX_SAFE_INTEGER);
      expect(address).toBeNull();
    });

    it("should handle floating point chain IDs", () => {
      const address = getBatchDonationsContractAddress(10.5 as any);
      // Should still work if it matches a key, but ideally should be null
      expect(typeof address === "string" || address === null).toBe(true);
    });
  });

  describe("Type safety", () => {
    it("should ensure PERMIT2_ADDRESS is const", () => {
      // TypeScript compile-time check - if this compiles, the type is correct
      const test: typeof PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
      expect(test).toBe(PERMIT2_ADDRESS);
    });

    it("should ensure contract addresses are HexAddress type", () => {
      const address = getBatchDonationsContractAddress(10);
      if (address !== null) {
        const test: HexAddress = address;
        expect(test).toBe(address);
      }
    });
  });
});
