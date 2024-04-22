import type { Hex, SignerOrProvider } from "@show-karma/karma-gap-sdk";
import { Networks } from "@show-karma/karma-gap-sdk/core/consts";
import { Contract } from "ethers";
import MulticallABI from '@show-karma/karma-gap-sdk/core/abi/MultiAttester.json'

export async function getContractOwner(signer: SignerOrProvider): Promise<Hex> {
  const chain =
    (await signer.provider.getNetwork()) || (signer.provider as any).network;
  const network = Object.values(Networks).find(
    (n) => +n.chainId === Number(chain.chainId)
  );
  if (!network)
    throw new Error(`Network ${chain.name || chain.chainId} not supported.`);

  const address = network.contracts.multicall;
  const contract = new Contract(address, MulticallABI, signer as any);
  const owner = await contract.owner?.();
  return owner;
}
