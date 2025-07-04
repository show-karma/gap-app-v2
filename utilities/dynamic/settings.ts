import { mergeNetworks } from "@dynamic-labs/sdk-react-core";
import { lisk } from "viem/chains";
import { envVars } from "../enviromentVars";

const customNetworks = [
  {
    blockExplorerUrls: ["https://etherscan.io/"],
    chainId: lisk.id,
    chainName: lisk.name,
    iconUrls: ["https://gap.karmahq.xyz/images/networks/lisk.svg"],
    name: lisk.name,
    nativeCurrency: {
      decimals: lisk.nativeCurrency.decimals,
      name: lisk.nativeCurrency.name,
      symbol: lisk.nativeCurrency.symbol,
      iconUrl: "https://gap.karmahq.xyz/images/networks/lisk.svg",
    },
    networkId: lisk.id,
    rpcUrls: [envVars.RPC.LISK],
    vanityName: lisk.name,
  },
];

export const dynamicSettings = {
  overrides: {
    evmNetworks: (primaryNetworks: any) =>
      mergeNetworks(primaryNetworks, customNetworks),
  },
};
