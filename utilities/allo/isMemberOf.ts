import { Hex, createPublicClient, http } from "viem";
import { envVars } from "../enviromentVars";
import { arbitrum, sepolia } from "viem/chains";
import AlloRegistryABI from "@show-karma/karma-gap-sdk/core/abi/AlloRegistry.json";
import { AlloContracts } from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";

export const isMemberOfProfile = async (address: string): Promise<boolean> => {
  try {
    const wallet = createPublicClient({
      chain: envVars.isDev ? sepolia : arbitrum,
      transport: http(
        envVars.isDev ? envVars.RPC.SEPOLIA : envVars.RPC.ARBITRUM
      ),
    });

    const call = await wallet.readContract({
      abi: AlloRegistryABI,
      address: AlloContracts.registry as Hex,
      functionName: "isMemberOfProfile",
      args: [
        envVars.PROFILE_ID,
        address, //address
      ],
    });

    if (call) return true;

    const checkBothCall = await wallet.readContract({
      abi: AlloRegistryABI,
      address: AlloContracts.registry as Hex,
      functionName: "isOwnerOrMemberOfProfile",
      args: [
        envVars.PROFILE_ID,
        address, //address
      ],
    });

    return (checkBothCall || call) as boolean;
  } catch (error: any) {
    errorManager(`Error checking if user is member of profile`, error);
    return false;
  }
};
