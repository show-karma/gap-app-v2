import { toHex } from "viem";
import {
  DEFAULT_CLAIM_CONTRACT_ADDRESS,
  getHedgeyContractAddress,
  HEDGEY_CONTRACT_ADDRESSES,
  uuidToBytes16,
} from "@/src/features/claim-funds/lib/hedgey-contract";

describe("uuidToBytes16", () => {
  test("standard UUID → correct hex", () => {
    expect(uuidToBytes16("91b6f54b-5304-47c3-b668-d3f2f25eae86")).toBe(
      "0x91b6f54b530447c3b668d3f2f25eae86"
    );
  });

  test("uppercase UUID is normalized", () => {
    expect(uuidToBytes16("91B6F54B-5304-47C3-B668-D3F2F25EAE86")).toBe(
      "0x91b6f54b530447c3b668d3f2f25eae86"
    );
  });

  test("all-zeros UUID", () => {
    expect(uuidToBytes16("00000000-0000-0000-0000-000000000000")).toBe(
      "0x00000000000000000000000000000000"
    );
  });

  test("throws on invalid input", () => {
    expect(() => uuidToBytes16("not-a-uuid")).toThrow("Invalid UUID format");
  });

  test("matches manual byte-parse of same UUID", () => {
    const id = "91b6f54b-5304-47c3-b668-d3f2f25eae86";
    // Manually parse UUID to bytes the same way uuid.parse() does:
    // strip dashes, parse each pair of hex chars as a byte
    const hex = id.replace(/-/g, "");
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    expect(uuidToBytes16(id)).toBe(toHex(bytes));
  });
});

describe("getHedgeyContractAddress", () => {
  test("returns correct Optimism address", () => {
    expect(getHedgeyContractAddress("optimism")).toBe("0x8A2725a6f04816A5274dDD9FEaDd3bd0C253C1A6");
  });

  test("returns correct Sepolia address", () => {
    expect(getHedgeyContractAddress("sepolia")).toBe("0x66f9323C7298B98f9F91a1D3f507Bf765EbEDf0B");
  });

  test("falls back to default address for unknown network", () => {
    expect(getHedgeyContractAddress("unknown-network")).toBe(DEFAULT_CLAIM_CONTRACT_ADDRESS);
  });

  test("Optimism address is NOT the old wrong address", () => {
    const optimismAddress = getHedgeyContractAddress("optimism");
    expect(optimismAddress).not.toBe("0x1bb64AF7FE05fc69c740609267d2AbE3e119Ef82");
  });

  test("HEDGEY_CONTRACT_ADDRESSES contains correct Optimism address", () => {
    expect(HEDGEY_CONTRACT_ADDRESSES.optimism).toBe("0x8A2725a6f04816A5274dDD9FEaDd3bd0C253C1A6");
  });
});
