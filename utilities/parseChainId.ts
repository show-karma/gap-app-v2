/**
 * Parse a chain ID from API/user/wallet inputs.
 * Supports decimal numbers/strings and hex strings (e.g. "0xa").
 */
export function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (/^0x[0-9a-f]+$/i.test(normalized)) {
    const parsed = Number.parseInt(normalized, 16);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  if (/^\d+$/.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  return undefined;
}
