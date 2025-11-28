import type { Hex, SignerOrProvider } from "@show-karma/karma-gap-sdk";
import MulticallABI from "@show-karma/karma-gap-sdk/core/abi/MultiAttester.json";
import { Networks } from "@show-karma/karma-gap-sdk/core/consts";
import { Contract } from "ethers";
import type { Chain } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";

export async function getContractOwner(
  signer: SignerOrProvider,
  chain: Chain
): Promise<Hex | undefined> {
  try {
    const network = Object.values(Networks).find((n) => +n.chainId === Number(chain.id));
    if (!network) throw new Error(`Network ${chain.name || chain.id} not supported.`);

    const address = network.contracts.multicall;
    const contract = new Contract(address, MulticallABI, signer);
    const owner = await contract.owner?.();
    return owner;
  } catch (error: unknown) {
    errorManager(`Error getting contract owner`, error);
    return undefined;
  }
}
