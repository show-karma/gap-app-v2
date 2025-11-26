/**
 * Creates a composite key for contract validation by combining network and address
 * @param network - The blockchain network identifier
 * @param address - The contract address
 * @returns A string key in the format "network:address"
 */
export const getContractKey = (network: string, address: string): string => `${network}:${address}`;
