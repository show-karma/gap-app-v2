/**
 * Creates a composite key for contract validation by combining network and address
 * Normalizes both values to lowercase to match backend validation
 * @param network - The blockchain network identifier
 * @param address - The contract address
 * @returns A string key in the format "network:address" (lowercase)
 */
export const getContractKey = (network: string, address: string): string =>
  `${network.toLowerCase()}:${address.toLowerCase()}`;
