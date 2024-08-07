import { Hex, createPublicClient, http } from "viem";
import { envVars } from "../enviromentVars";
import { arbitrum, sepolia } from "viem/chains";
import AlloRegistryABI from "@show-karma/karma-gap-sdk/core/abi/AlloRegistry.json";
import { AlloContracts } from "@show-karma/karma-gap-sdk";

export const isMemberOfProfile = async (address: string): Promise<boolean> => {
  try {
    const wallet = createPublicClient({
      chain: envVars.isDev ? sepolia : arbitrum,
      transport: http(
        envVars.isDev ? envVars.RPC.SEPOLIA : envVars.RPC.ARBITRUM
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

    if (call) return true;

    const checkBothCall = await wallet
      .readContract({
        abi: AlloRegistryABI,
        address: AlloContracts.registry as Hex,
        functionName: "isOwnerOrMemberOfProfile",
        args: [
          envVars.PROFILE_ID,
          address, //address
        ],
      })
      .catch(() => false);

    return (checkBothCall || call) as boolean;
  } catch {
    return false;
  }
};
