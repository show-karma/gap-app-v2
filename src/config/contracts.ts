// Contract addresses by network

export interface ContractAddresses {
  gap?: string;
  donations?: string;
  eas?: string;
  schemaRegistry?: string;
}

export const contracts: Record<number, ContractAddresses> = {
  // Optimism
  10: {
    eas: "0x4E0275Ea5a89e7a3c1B58411379D1a0eDdc5b088",
    schemaRegistry: "0x4E0275Ea5a89e7a3c1B58411379D1a0eDdc5b088",
  },
  // Arbitrum One
  42161: {
    eas: "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458",
    schemaRegistry: "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458",
  },
  // Base
  8453: {
    eas: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
  },
  // Sepolia
  11155111: {
    eas: "0xC2679fBD37d54388Ce493F1DB75320D236e1815e",
    schemaRegistry: "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0",
  },
  // Optimism Sepolia
  11155420: {
    eas: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
  },
  // Base Sepolia
  84532: {
    eas: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
  },
  // Add more networks as needed
};

// Schema IDs by network
export const schemas = {
  // Add schema IDs here as they are discovered
  profile: {
    11155111: "0x...", // Sepolia
    10: "0x...", // Optimism
    // etc
  },
  project: {
    11155111: "0x...",
    10: "0x...",
  },
  // Add more schemas as needed
};

// Helper function to get contract address by network
export const getContractAddress = (
  chainId: number,
  contractName: keyof ContractAddresses
): string | undefined => {
  return contracts[chainId]?.[contractName];
};