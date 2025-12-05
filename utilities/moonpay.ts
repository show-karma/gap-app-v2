import {
  getMoonPaySupportedTokens,
  MAINNET_CHAINS,
  SUPPORTED_TOKENS,
} from "@/constants/supportedTokens";
import { getChainNameById } from "./network";

const MOONPAY_CURRENCY_OVERRIDES: Record<string, string> = {
  ETH_ethereum: "eth",
  USDC_ethereum: "usdc",
  USDT_ethereum: "usdt",
  CELO_celo: "celo",
  CUSD_celo: "cusd",
};

export const toMoonPayNetworkName = (chainId: number): string => {
  if (chainId === 1) {
    return "ethereum";
  }
  const networkName = getChainNameById(chainId);
  return networkName;
};

export const getMoonPayCurrencyCode = (crypto: string, network: string): string => {
  const token = SUPPORTED_TOKENS.find(
    (t) =>
      t.symbol.toUpperCase() === crypto.toUpperCase() && toMoonPayNetworkName(t.chainId) === network
  );

  if (token?.moonPay?.customCurrencyCode) {
    return token.moonPay.customCurrencyCode;
  }

  const key = `${crypto.toUpperCase()}_${network}`;
  return MOONPAY_CURRENCY_OVERRIDES[key] ?? `${crypto.toLowerCase()}_${network}`;
};

export const isMoonPaySupported = (symbol: string, chainId: number): boolean => {
  const token = SUPPORTED_TOKENS.find((t) => t.symbol === symbol && t.chainId === chainId);
  return token?.moonPay?.supported ?? false;
};

export const getAllowedMoonPayCurrencies = (): string => {
  const currencies = getMoonPaySupportedTokens()
    .filter((token) => MAINNET_CHAINS.includes(token.chainId))
    .map((token) => {
      const network = toMoonPayNetworkName(token.chainId);
      return getMoonPayCurrencyCode(token.symbol, network);
    });

  return [...new Set(currencies)].sort().join(",");
};
