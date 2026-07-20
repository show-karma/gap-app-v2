import { ensureCryptoRandomUUID } from "@/utilities/auth/ensure-crypto-random-uuid";

describe("ensureCryptoRandomUUID", () => {
  const originalRandomUuid = globalThis.crypto.randomUUID;

  afterEach(() => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: originalRandomUuid,
    });
  });

  it("installs an RFC-compliant UUIDv4 fallback when randomUUID is unavailable", () => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });

    ensureCryptoRandomUUID();

    expect(globalThis.crypto.randomUUID).toBeTypeOf("function");
    expect(globalThis.crypto.randomUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("preserves the browser implementation when it already exists", () => {
    const browserRandomUuid = vi.fn(() => "00000000-0000-4000-8000-000000000000" as const);
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: browserRandomUuid,
    });

    ensureCryptoRandomUUID();

    expect(globalThis.crypto.randomUUID).toBe(browserRandomUuid);
  });
});
