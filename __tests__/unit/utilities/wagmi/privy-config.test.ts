import fs from "node:fs";
import path from "node:path";

describe("privy-config", () => {
  const configPath = path.resolve(__dirname, "../../../../utilities/wagmi/privy-config.ts");
  const source = fs.readFileSync(configPath, "utf-8");

  describe("minimalWagmiConfig", () => {
    it("should disable multiInjectedProviderDiscovery", () => {
      // Extract the minimalWagmiConfig block
      const minimalConfigMatch = source.match(
        /export const minimalWagmiConfig\s*=\s*createMinimalConfig\(\{([\s\S]*?)\}\);/
      );
      expect(minimalConfigMatch).not.toBeNull();
      const configBlock = minimalConfigMatch![1];
      expect(configBlock).toContain("multiInjectedProviderDiscovery: false");
    });

    it("should enable SSR", () => {
      const minimalConfigMatch = source.match(
        /export const minimalWagmiConfig\s*=\s*createMinimalConfig\(\{([\s\S]*?)\}\);/
      );
      expect(minimalConfigMatch).not.toBeNull();
      const configBlock = minimalConfigMatch![1];
      expect(configBlock).toContain("ssr: true");
    });

    it("should set pollingInterval to 30 seconds", () => {
      const minimalConfigMatch = source.match(
        /export const minimalWagmiConfig\s*=\s*createMinimalConfig\(\{([\s\S]*?)\}\);/
      );
      expect(minimalConfigMatch).not.toBeNull();
      const configBlock = minimalConfigMatch![1];
      expect(configBlock).toContain("pollingInterval: 30_000");
    });
  });
});
