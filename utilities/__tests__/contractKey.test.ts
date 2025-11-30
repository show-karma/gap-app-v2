import { getContractKey } from "../contractKey";

describe("getContractKey", () => {
  describe("Case Normalization", () => {
    it("should normalize network to lowercase", () => {
      const result = getContractKey("ETHEREUM", "0xABC123");
      expect(result).toBe("ethereum:0xabc123");
    });

    it("should normalize address to lowercase", () => {
      const result = getContractKey("ethereum", "0xABC123DEF456");
      expect(result).toBe("ethereum:0xabc123def456");
    });

    it("should normalize both network and address to lowercase", () => {
      const result = getContractKey("OPTIMISM", "0xABCDEF123456");
      expect(result).toBe("optimism:0xabcdef123456");
    });

    it("should handle already lowercase inputs", () => {
      const result = getContractKey("ethereum", "0xabc123");
      expect(result).toBe("ethereum:0xabc123");
    });

    it("should handle mixed case inputs consistently", () => {
      const result1 = getContractKey("Ethereum", "0xAbC123");
      const result2 = getContractKey("ETHEREUM", "0xABC123");
      const result3 = getContractKey("ethereum", "0xabc123");

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe("ethereum:0xabc123");
    });
  });

  describe("Key Format", () => {
    it("should return colon-separated network and address", () => {
      const result = getContractKey("ethereum", "0x123");
      expect(result).toBe("ethereum:0x123");
    });

    it("should preserve special characters in address", () => {
      const result = getContractKey("ethereum", "0xABCDEF123456789");
      expect(result).toBe("ethereum:0xabcdef123456789");
    });

    it("should handle different network names", () => {
      expect(getContractKey("ethereum", "0x123")).toBe("ethereum:0x123");
      expect(getContractKey("optimism", "0x456")).toBe("optimism:0x456");
      expect(getContractKey("arbitrum", "0x789")).toBe("arbitrum:0x789");
      expect(getContractKey("polygon", "0xabc")).toBe("polygon:0xabc");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings", () => {
      const result = getContractKey("", "");
      expect(result).toBe(":");
    });

    it("should handle network with spaces", () => {
      const result = getContractKey("ethereum mainnet", "0x123");
      expect(result).toBe("ethereum mainnet:0x123");
    });

    it("should handle very long addresses", () => {
      const longAddress = "0x" + "a".repeat(100);
      const result = getContractKey("ethereum", longAddress);
      expect(result).toBe(`ethereum:${longAddress}`);
    });

    it("should handle addresses without 0x prefix", () => {
      const result = getContractKey("ethereum", "ABC123");
      expect(result).toBe("ethereum:abc123");
    });
  });

  describe("Consistency for Duplicate Detection", () => {
    it("should produce same key for case-insensitive duplicates", () => {
      const key1 = getContractKey("Ethereum", "0xABC123");
      const key2 = getContractKey("ethereum", "0xabc123");
      const key3 = getContractKey("ETHEREUM", "0xAbC123");

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    it("should produce different keys for different networks", () => {
      const key1 = getContractKey("ethereum", "0x123");
      const key2 = getContractKey("optimism", "0x123");

      expect(key1).not.toBe(key2);
    });

    it("should produce different keys for different addresses", () => {
      const key1 = getContractKey("ethereum", "0x123");
      const key2 = getContractKey("ethereum", "0x456");

      expect(key1).not.toBe(key2);
    });
  });
});
