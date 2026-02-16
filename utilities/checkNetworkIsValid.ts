import { appNetwork } from "./network-chains";

const appNetworkIds = new Set(appNetwork.map((network) => network.id));

export const checkNetworkIsValid = (networkId?: number): boolean =>
  networkId !== undefined && appNetworkIds.has(networkId);
