import type { Hex, SignerOrProvider } from "@show-karma/karma-gap-sdk";
import { GAP } from "@show-karma/karma-gap-sdk";

export async function getContractOwner(signer: SignerOrProvider): Promise<Hex> {
  const multicall = await GAP.getMulticall(signer);
  const owner = await multicall.owner?.();
  return owner[0];
}
