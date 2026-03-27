/**
 * Pattern matching Ethereum hex addresses (e.g., "0x0", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48").
 * Used to filter contract addresses from currency display fields.
 */
export const HEX_ADDRESS_PATTERN = /^0x[0-9a-fA-F]*$/;

export function isHexAddress(value: string | undefined | null): boolean {
  return value ? HEX_ADDRESS_PATTERN.test(value) : false;
}
