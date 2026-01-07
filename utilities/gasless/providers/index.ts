import type { GaslessProviderType, IGaslessProvider } from "../types";
import { AlchemyProvider } from "./alchemy.provider";
import { ZeroDevProvider } from "./zerodev.provider";

/**
 * Registry of all available gasless providers.
 * Add new providers here when implementing support for additional services.
 */
const providerInstances: Record<GaslessProviderType, IGaslessProvider> = {
  zerodev: new ZeroDevProvider(),
  alchemy: new AlchemyProvider(),
};

/**
 * Get a provider instance by type.
 * @throws Error if provider type is not registered
 */
export function getProvider(type: GaslessProviderType): IGaslessProvider {
  const provider = providerInstances[type];
  if (!provider) {
    throw new Error(`Unknown gasless provider: ${type}`);
  }
  return provider;
}

/**
 * Get all registered provider types.
 */
export function getRegisteredProviders(): GaslessProviderType[] {
  return Object.keys(providerInstances) as GaslessProviderType[];
}

// Re-export provider classes for direct use if needed
export { AlchemyProvider } from "./alchemy.provider";
export { ZeroDevProvider } from "./zerodev.provider";
