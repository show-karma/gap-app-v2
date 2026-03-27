/**
 * Tests for lazy instantiation of gasless providers.
 * Verifies that getProvider is async and that getRegisteredProviders
 * returns the correct types without requiring instantiation.
 */

// Mock the provider modules - these get hoisted
vi.mock("@/utilities/gasless/providers/zerodev.provider", () => ({
  ZeroDevProvider: class {
    name = "zerodev";
    createClient = vi.fn();
    toEthersSigner = vi.fn();
  },
}));

vi.mock("@/utilities/gasless/providers/alchemy.provider", () => ({
  AlchemyProvider: class {
    name = "alchemy";
    createClient = vi.fn();
    toEthersSigner = vi.fn();
  },
}));

describe("Gasless providers lazy instantiation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

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

describe("No static re-exports", () => {
  it("should not statically export AlchemyProvider or ZeroDevProvider", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const source = fs.readFileSync(
      path.resolve(currentDir, "../../../../utilities/gasless/providers/index.ts"),
      "utf-8"
    );
    expect(source).not.toMatch(/^export\s*\{.*AlchemyProvider.*\}/m);
    expect(source).not.toMatch(/^export\s*\{.*ZeroDevProvider.*\}/m);
  });
});
