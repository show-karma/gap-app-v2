import type { GaslessProviderType, IGaslessProvider } from "../types";

/**
 * Registry of all available gasless providers.
 * Providers are lazily instantiated on first access to avoid pulling
 * heavy dependencies (ethers, ZeroDev SDK, Alchemy SDK) into the shared bundle.
 */
let providerInstances: Record<GaslessProviderType, IGaslessProvider> | null = null;

async function getProviderInstances(): Promise<Record<GaslessProviderType, IGaslessProvider>> {
  if (providerInstances) return providerInstances;
  const [{ ZeroDevProvider }, { AlchemyProvider }] = await Promise.all([
    import("./zerodev.provider"),
    import("./alchemy.provider"),
  ]);
  providerInstances = {
    zerodev: new ZeroDevProvider(),
    alchemy: new AlchemyProvider(),
  };
  return providerInstances;
}

/**
 * Get a provider instance by type.
 * @throws Error if provider type is not registered
 */
export async function getProvider(type: GaslessProviderType): Promise<IGaslessProvider> {
  const instances = await getProviderInstances();
  const provider = instances[type];
  if (!provider) {
    throw new Error(`Unknown gasless provider: ${type}`);
  }
  return provider;
}

/**
 * Get all registered provider types.
 */
export function getRegisteredProviders(): GaslessProviderType[] {
  return ["zerodev", "alchemy"];
}

// Re-export provider classes for direct use if needed
export { AlchemyProvider } from "./alchemy.provider";
export { ZeroDevProvider } from "./zerodev.provider";
