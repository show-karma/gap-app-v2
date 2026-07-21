type UUID = `${string}-${string}-${string}-${string}-${string}`;

function bytesToUuid(bytes: Uint8Array): UUID {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

/**
 * Privy calls `crypto.randomUUID()` during module evaluation. Some browsers
 * expose `crypto.getRandomValues()` but omit `randomUUID()` on non-secure or
 * older contexts, which otherwise makes the deferred SDK import crash before
 * the sign-in modal can open.
 */
export function ensureCryptoRandomUUID(): void {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") return;
  if (typeof webCrypto?.getRandomValues !== "function") return;

  Object.defineProperty(webCrypto, "randomUUID", {
    configurable: true,
    value: (): UUID => {
      const bytes = webCrypto.getRandomValues(new Uint8Array(16));
      // RFC 9562 UUIDv4: version nibble 4 and RFC 4122/9562 variant bits 10.
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      return bytesToUuid(bytes);
    },
  });
}
