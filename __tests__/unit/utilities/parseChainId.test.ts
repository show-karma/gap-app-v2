import { parseChainId } from "@/utilities/parseChainId";

describe("parseChainId", () => {
  it("parses decimal numbers", () => {
    expect(parseChainId(10)).toBe(10);
    expect(parseChainId("42161")).toBe(42161);
  });

  it("parses hex strings", () => {
    expect(parseChainId("0xa")).toBe(10);
    expect(parseChainId("0xA4B1")).toBe(42161);
  });

  it("returns undefined for invalid values", () => {
    expect(parseChainId(0)).toBeUndefined();
    expect(parseChainId(-1)).toBeUndefined();
    expect(parseChainId("")).toBeUndefined();
    expect(parseChainId("  ")).toBeUndefined();
    expect(parseChainId("abc")).toBeUndefined();
    expect(parseChainId("0x")).toBeUndefined();
    expect(parseChainId(undefined)).toBeUndefined();
    expect(parseChainId(null)).toBeUndefined();
  });
});
