import { SignerOrProvider } from "@show-karma/karma-gap-sdk/core/types";
import { Hex } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Networks } from "@show-karma/karma-gap-sdk/core/consts";
import { Contract } from "ethers";
import MulticallABI from "@show-karma/karma-gap-sdk/core/abi/MultiAttester.json";
import { Chain } from "viem";

export async function getContractOwner(
  signer: SignerOrProvider,
  chain: Chain
): Promise<Hex> {
  const network = Object.values(Networks).find(
    (n) => +n.chainId === Number(chain.id)
  );
  if (!network)
    throw new Error(`Network ${chain.name || chain.id} not supported.`);

  const address = network.contracts.multicall;
  const contract = new Contract(address, MulticallABI, signer as any);
  const owner = await contract.owner?.();
  return owner;
}
