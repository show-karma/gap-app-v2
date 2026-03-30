import { uuidToBytes16 } from "@/src/features/claim-funds/lib/hedgey-contract";

describe("uuidToBytes16", () => {
  // ── Valid UUID conversions ──────────────────────────────────────────────────

  it("converts a standard v4 UUID to a 0x-prefixed hex string", () => {
    const result = uuidToBytes16("550e8400-e29b-41d4-a716-446655440000");
    expect(result).toMatch(/^0x[0-9a-f]{32}$/);
  });

  it("strips dashes and produces correct hex output", () => {
    const result = uuidToBytes16("aabbccdd-1122-3344-aabb-ccdd11223344");
    // The hex representation of those bytes
    expect(result).toBe("0xaabbccdd11223344aabbccdd11223344");
  });

  it("handles uppercase UUID input (lowercases internally)", () => {
    const result = uuidToBytes16("AABBCCDD-1122-3344-AABB-CCDD11223344");
    expect(result).toBe("0xaabbccdd11223344aabbccdd11223344");
  });

  it("handles mixed-case UUID input", () => {
    const result = uuidToBytes16("AaBbCcDd-1122-3344-aAbB-CcDd11223344");
    expect(result).toBe("0xaabbccdd11223344aabbccdd11223344");
  });

  it("trims whitespace from input", () => {
    const result = uuidToBytes16("  550e8400-e29b-41d4-a716-446655440000  ");
    expect(result).toMatch(/^0x[0-9a-f]{32}$/);
  });

  it("returns exactly 34 characters (0x + 32 hex chars = 16 bytes)", () => {
    const result = uuidToBytes16("550e8400-e29b-41d4-a716-446655440000");
    // 0x prefix + 32 hex chars
    expect(result.length).toBe(34);
  });

  // ── Invalid UUID formats ────────────────────────────────────────────────────

  it("throws for UUID missing dashes", () => {
    expect(() => uuidToBytes16("550e8400e29b41d4a716446655440000")).toThrow("Invalid UUID format");
  });

  it("throws for empty string", () => {
    expect(() => uuidToBytes16("")).toThrow("Invalid UUID format");
  });

  it("throws for random non-UUID string", () => {
    expect(() => uuidToBytes16("not-a-uuid")).toThrow("Invalid UUID format");
  });

  it("throws for UUID with wrong segment lengths", () => {
    expect(() => uuidToBytes16("550e840-0e29b-41d4-a716-446655440000")).toThrow(
      "Invalid UUID format"
    );
  });

  it("throws for UUID with non-hex characters", () => {
    expect(() => uuidToBytes16("zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz")).toThrow(
      "Invalid UUID format"
    );
  });

  it("includes the original input in the error message", () => {
    const badUuid = "bad-input";
    expect(() => uuidToBytes16(badUuid)).toThrow(badUuid);
  });
});
