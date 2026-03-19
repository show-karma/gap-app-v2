/**
 * Tests for lazy instantiation of gasless providers.
 * Verifies that getProvider is async and that getRegisteredProviders
 * returns the correct types without requiring instantiation.
 */

// Mock the provider modules - these get hoisted
jest.mock("@/utilities/gasless/providers/zerodev.provider", () => ({
  ZeroDevProvider: jest.fn().mockImplementation(() => ({
    name: "zerodev",
    createClient: jest.fn(),
    toEthersSigner: jest.fn(),
  })),
}));

jest.mock("@/utilities/gasless/providers/alchemy.provider", () => ({
  AlchemyProvider: jest.fn().mockImplementation(() => ({
    name: "alchemy",
    createClient: jest.fn(),
    toEthersSigner: jest.fn(),
  })),
}));

describe("Gasless providers lazy instantiation", () => {
  describe("getProvider", () => {
    it("should return a promise (be async)", async () => {
      const { getProvider } = await import("@/utilities/gasless/providers");

      const result = getProvider("zerodev");

      // getProvider should return a promise
      expect(result).toBeInstanceOf(Promise);
      // and resolve to a provider
      const provider = await result;
      expect(provider).toBeDefined();
      expect(provider.name).toBe("zerodev");
    });

    it("should resolve to the correct provider for zerodev", async () => {
      const { getProvider } = await import("@/utilities/gasless/providers");

      const provider = await getProvider("zerodev");

      expect(provider.name).toBe("zerodev");
    });

    it("should resolve to the correct provider for alchemy", async () => {
      const { getProvider } = await import("@/utilities/gasless/providers");

      const provider = await getProvider("alchemy");

      expect(provider.name).toBe("alchemy");
    });

    it("should reject for unknown provider type", async () => {
      const { getProvider } = await import("@/utilities/gasless/providers");

      await expect(
        // @ts-expect-error - Testing invalid provider type
        getProvider("unknown")
      ).rejects.toThrow("Unknown gasless provider: unknown");
    });
  });

  describe("getRegisteredProviders", () => {
    it("should return provider types synchronously", async () => {
      const { getRegisteredProviders } = await import("@/utilities/gasless/providers");

      const providers = getRegisteredProviders();

      expect(providers).toContain("zerodev");
      expect(providers).toContain("alchemy");
      expect(providers.length).toBe(2);
    });
  });
});
