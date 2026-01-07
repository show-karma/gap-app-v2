/**
 * Filter options for the funding map
 * Extracted from components/Pages/ProgramRegistry/helper.ts
 */

export const FUNDING_MAP_NETWORKS = [
  "Aleo",
  "Aleph Zero",
  "Bitcoin",
  "Cardano",
  "Celo",
  "Cosmos/IBC",
  "Degen",
  "EVM",
  "Farcaster",
  "NEAR",
  "Nouns",
  "Polkadot",
  "Ripple",
  "Solana",
  "Soneium",
  "Starknet",
  "Stellar",
  "TON",
  "Tezos",
  "Tron",
  "zCash",
] as const;

export const FUNDING_MAP_ECOSYSTEMS = [
  "Aave",
  "Akash",
  "Alchemy",
  "Algorand",
  "Aptos",
  "Aragon",
  "Arbitrum",
  "Arcana",
  "Astar",
  "Aurora",
  "Avalanche",
  "Base",
  "Berachain",
  "Binance Smart Chain",
  "Bitcoin",
  "Boba Network",
  "Callisto Network",
  "Canto",
  "Cardano",
  "Casper",
  "Celo",
  "Chainlink",
  "CoinEx Smart Chain",
  "Compound",
  "Conflux",
  "Coreum",
  "Cosmos",
  "Cronos",
  "Dash",
  "Decentraland",
  "Decred",
  "Dfinity",
  "Edgeware",
  "EOSIO",
  "Ethereum",
  "Fantom",
  "Farcaster",
  "Findora",
  "Flare",
  "Flow",
  "Fuel",
  "Gnosis Chain",
  "Harmony",
  "Hedera",
  "Helium",
  "Horizen",
  "Interlay",
  "IoTeX",
  "Kava",
  "Klaytn",
  "KuCoin",
  "Lisk",
  "Lit Protocol",
  "Metis",
  "Mina",
  "Moonbeam",
  "Moonriver",
  "Near",
  "NEO",
  "Neon",
  "Nervos Network",
  "OAK Network",
  "Oasis Network",
  "Obyte",
  "OKC",
  "Optimism",
  "PIVX",
  "Polkadot",
  "Polygon",
  "Radix",
  "Ravencoin",
  "REI Network",
  "Ripple",
  "Ronin",
  "Solana",
  "Sovryn",
  "Stacks",
  "StarCoin",
  "Stellar",
  "Sui",
  "Syscoin",
  "Telos",
  "Tezos",
  "Thundercore",
  "TON",
  "Tron",
  "Uniswap",
  "Vechain",
  "Velas",
  "Waves",
  "XPR Network",
  "zCash",
  "ZetaChain",
  "Zilliqa",
] as const;

export const FUNDING_MAP_CATEGORIES = [
  "AI",
  "DEX",
  "DeFi",
  "DeFAI",
  "GameFi",
  "NFT",
  "Lend/Borrow",
  "Communities",
  "Research",
  "Yield Farming",
  "Infrastructure",
  "DeSci",
] as const;

export const FUNDING_MAP_GRANT_TYPES = [
  "Direct Grants",
  "Bounties",
  "Retro Funding",
  "Quadratic Funding",
  "Hackathons",
  "Accelerators",
] as const;

export const FUNDING_MAP_STATUSES = ["Active", "Inactive"] as const;

export const FUNDING_MAP_SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "ending-soon", label: "Ending Soon" },
] as const;

export const FUNDING_MAP_PAGE_SIZE = 24;

export const FUNDING_MAP_DEFAULT_CHAIN_ID =
  process.env.NEXT_PUBLIC_ENV === "production" ? 42161 : 11155111;

/**
 * Network images for display
 */
export const NETWORK_IMAGES: Record<string, { light: string; dark: string }> = {
  aleo: {
    light: "/images/networks/aleo-light.svg",
    dark: "/images/networks/aleo-dark.svg",
  },
  "aleph zero": {
    light: "/images/networks/aleph-zero-light.svg",
    dark: "/images/networks/aleph-zero-dark.svg",
  },
  bitcoin: {
    light: "/images/networks/bitcoin.svg",
    dark: "/images/networks/bitcoin.svg",
  },
  cardano: {
    light: "/images/networks/cardano.svg",
    dark: "/images/networks/cardano.svg",
  },
  celo: {
    light: "/images/networks/celo.svg",
    dark: "/images/networks/celo.svg",
  },
  "cosmos/ibc": {
    light: "/images/networks/cosmos.svg",
    dark: "/images/networks/cosmos.svg",
  },
  degen: {
    light: "/images/networks/degen.svg",
    dark: "/images/networks/degen.svg",
  },
  evm: {
    light: "/images/networks/ethereum.svg",
    dark: "/images/networks/ethereum.svg",
  },
  farcaster: {
    light: "/images/networks/farcaster.svg",
    dark: "/images/networks/farcaster.svg",
  },
  near: {
    light: "/images/networks/near.svg",
    dark: "/images/networks/near.svg",
  },
  nouns: {
    light: "/images/networks/nouns.jpeg",
    dark: "/images/networks/nouns.jpeg",
  },
  polkadot: {
    light: "/images/networks/polkadot.svg",
    dark: "/images/networks/polkadot.svg",
  },
  ripple: {
    light: "/images/networks/ripple.svg",
    dark: "/images/networks/ripple.svg",
  },
  solana: {
    light: "/images/networks/solana.svg",
    dark: "/images/networks/solana.svg",
  },
  sony: {
    light: "/images/networks/soneium-light.svg",
    dark: "/images/networks/soneium-dark.svg",
  },
  soneium: {
    light: "/images/networks/soneium-light.svg",
    dark: "/images/networks/soneium-dark.svg",
  },
  starknet: {
    light: "/images/networks/starknet-light.svg",
    dark: "/images/networks/starknet-dark.svg",
  },
  stellar: {
    light: "/images/networks/stellar-light.svg",
    dark: "/images/networks/stellar-dark.svg",
  },
  ton: {
    light: "/images/networks/ton.svg",
    dark: "/images/networks/ton.svg",
  },
  tezos: {
    light: "/images/networks/tezos.svg",
    dark: "/images/networks/tezos.svg",
  },
  tron: {
    light: "/images/networks/tron.svg",
    dark: "/images/networks/tron.svg",
  },
  zcash: {
    light: "/images/networks/zcash.svg",
    dark: "/images/networks/zcash.svg",
  },
};

export type FundingMapNetwork = (typeof FUNDING_MAP_NETWORKS)[number];
export type FundingMapEcosystem = (typeof FUNDING_MAP_ECOSYSTEMS)[number];
export type FundingMapCategory = (typeof FUNDING_MAP_CATEGORIES)[number];
export type FundingMapGrantType = (typeof FUNDING_MAP_GRANT_TYPES)[number];
export type FundingMapStatus = (typeof FUNDING_MAP_STATUSES)[number];
