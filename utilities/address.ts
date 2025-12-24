import { type Hex, isAddress } from "viem";

export function resolvePayoutAddress(
  payoutAddress: Hex | string | Record<string, string> | undefined,
  communityContract?: string
): string {
  if (!payoutAddress) return "";

  if (typeof payoutAddress === "string") {
    return isAddress(payoutAddress) ? payoutAddress : "";
  }

  if (typeof payoutAddress === "object") {
    if (communityContract && payoutAddress[communityContract]) {
      const addr = payoutAddress[communityContract];
      return typeof addr === "string" && isAddress(addr) ? addr : "";
    }

    const firstValidAddress = Object.values(payoutAddress).find(
      (addr) => typeof addr === "string" && isAddress(addr)
    );
    return firstValidAddress || "";
  }

  return "";
}
