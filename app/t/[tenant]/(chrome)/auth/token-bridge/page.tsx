import type { Metadata } from "next";
import { TokenBridge } from "@/src/features/token-bridge/components/token-bridge";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

// Not a destination: the marketing site frames it, nobody navigates to it, and
// search engines have no business indexing an empty page.
export const metadata: Metadata = {
  title: "Session bridge",
  robots: { index: false, follow: false },
};

// Block class. The token in the URL is the authorization, so this segment must
// never be painted from a prefetched shell — the server has to see the request.
// `instant = false` opts it out of instant navigation. The export is only legal
// with `cacheComponents` enabled (without it the build throws "cannot use
// `export const instant = ...`"), which is why it lands with the flag.
export const instant = false;

/**
 * The token bridge. See `src/features/token-bridge/components/token-bridge.tsx`
 * for what it does and `utilities/token-bridge/origins.ts` for who may frame
 * it. On a host with no configured embedder the component answers nobody.
 */
export default async function TokenBridgePage() {
  const { tenantConfig } = await getWhitelabelContext();
  return <TokenBridge origins={tenantConfig?.tokenBridgeOrigins ?? []} />;
}
