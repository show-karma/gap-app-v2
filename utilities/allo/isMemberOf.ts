import { Hex, createPublicClient, http } from "viem";
import { envVars } from "../enviromentVars";
import { arbitrum, optimismSepolia } from "viem/chains";
import AlloRegistryABI from "@show-karma/karma-gap-sdk/core/abi/AlloRegistry.json";
import { AlloContracts } from "@show-karma/karma-gap-sdk";

export const isMemberOfProfile = async (address: string): Promise<boolean> => {
  try {
    const wallet = createPublicClient({
      chain: envVars.isDev ? optimismSepolia : arbitrum,
      transport: http(
        envVars.isDev ? envVars.RPC.OPT_SEPOLIA : envVars.RPC.ARBITRUM
      ),
    });

    const call = await wallet
      .readContract({
        abi: AlloRegistryABI,
        address: AlloContracts.registry as Hex,
        functionName: "isMemberOfProfile",
        args: [
          envVars.PROFILE_ID,
          address, //address
        ],
      })
      .catch(() => false);

    return call as boolean;
  } catch {
    return false;
  }
};
