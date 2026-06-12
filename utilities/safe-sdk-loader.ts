import type SafeApiKit from "@safe-global/api-kit";
import type Safe from "@safe-global/protocol-kit";

/**
 * The Safe SDK ships deep CJS/ESM class hierarchies (embedded ethers v6) that are a known
 * trigger for "Class extends value undefined is not a constructor" chunk-order crashes when
 * webpack splits them across vendor chunks. Importing them lazily keeps the heavyweight Web3
 * transaction stack out of any bundle that does not actually open a payout flow, and shields
 * the modules that DO use it from the same vendor-chunk initialization hazard.
 *
 * The import promise is memoized at module scope so the SDK is only evaluated once per session.
 * This lives in its own module (rather than inline in `utilities/safe.ts`) so the heavy file
 * stays within its size budget; the lazy `import()` calls below still create their own chunk.
 */
let safeProtocolKitPromise: Promise<typeof Safe> | null = null;
let safeApiKitPromise: Promise<typeof SafeApiKit> | null = null;

export async function loadSafeProtocolKit(): Promise<typeof Safe> {
  if (!safeProtocolKitPromise) {
    safeProtocolKitPromise = import("@safe-global/protocol-kit").then((mod) => mod.default);
  }
  return safeProtocolKitPromise;
}

export async function loadSafeApiKit(): Promise<typeof SafeApiKit> {
  if (!safeApiKitPromise) {
    safeApiKitPromise = import("@safe-global/api-kit").then((mod) => mod.default);
  }
  return safeApiKitPromise;
}
