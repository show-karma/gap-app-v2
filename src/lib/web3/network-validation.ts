import { appNetwork } from "@/config/network";

export const checkNetworkIsValid = (networkId?: number) =>
  networkId && (appNetwork.map((a) => a.id) as number[]).includes(networkId);
