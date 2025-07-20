import type { Hex, SignerOrProvider } from "@show-karma/karma-gap-sdk";
import { Networks } from "@show-karma/karma-gap-sdk/core/consts";
import { Contract } from "ethers";
import MulticallABI from "@show-karma/karma-gap-sdk/core/abi/MultiAttester.json";
import { Chain } from "viem";
import { errorManager } from "@/lib/utils/error-manager";

export async function getContractOwner(
  signer: SignerOrProvider,
  chain: Chain
): Promise<Hex | undefined> {
  try {
    const network = Object.values(Networks).find(
      (n) => +n.chainId === Number(chain.id)
    );
    if (!network)
      throw new Error(`Network ${chain.name || chain.id} not supported.`);

    const address = network.contracts.multicall;
    const contract = new Contract(address, MulticallABI, signer as any);
    const owner = await contract.owner?.();
    return owner;
  } catch (error: any) {
    errorManager(`Error getting contract owner`, error);
    return undefined;
  }
}
