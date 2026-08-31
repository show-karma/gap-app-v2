import type { Metadata } from "next";
import { TokenBridge } from "@/src/features/token-bridge/components/token-bridge";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

// Not a destination: the marketing site frames it, nobody navigates to it, and
// search engines have no business indexing an empty page.
export const metadata: Metadata = {
  title: "Session bridge",
  robots: { index: false, follow: false },
};

/**
 * The token bridge. See `src/features/token-bridge/components/token-bridge.tsx`
 * for what it does and `utilities/token-bridge/origins.ts` for who may frame
 * it. On a host with no configured embedder the component answers nobody.
 */
export default async function TokenBridgePage() {
  const { tenantConfig } = await getWhitelabelContext();
  return <TokenBridge origins={tenantConfig?.tokenBridgeOrigins ?? []} />;
}
