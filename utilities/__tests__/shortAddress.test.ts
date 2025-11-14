import { shortAddress } from "../shortAddress"

describe("shortAddress", () => {
  it("should shorten a standard Ethereum address", () => {
    const address = "0x1234567890123456789012345678901234567890"
    const result = shortAddress(address)
    expect(result).toBe("0x1234...567890")
  })

  it("should take first 6 and last 6 characters", () => {
    const address = "0xabcdefABCDEF0123456789ABCDEF0123456789"
    const result = shortAddress(address)
    expect(result).toBe("0xabcd...456789")
  })

  it("should work with lowercase addresses", () => {
    const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    const result = shortAddress(address)
    expect(result).toBe("0xaaaa...aaaaaa")
  })

  it("should work with uppercase addresses", () => {
    const address = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
    const result = shortAddress(address)
    expect(result).toBe("0xBBBB...BBBBBB")
  })

  it("should work with mixed case addresses", () => {
    const address = "0xAaBbCcDdEeFf0011223344556677889900112233"
    const result = shortAddress(address)
    expect(result).toBe("0xAaBb...112233")
  })

  it("should handle short strings gracefully", () => {
    const address = "0x123456"
    const result = shortAddress(address)
    // Will take first 6 and last 6, which overlap for short strings
    expect(result).toBe("0x1234...123456")
  })

  it("should handle very short strings", () => {
    const address = "0x12"
    const result = shortAddress(address)
    expect(result).toBe("0x12...0x12")
  })

  it("should preserve the ellipsis format", () => {
    const address = "0x1234567890123456789012345678901234567890"
    const result = shortAddress(address)
    expect(result).toContain("...")
  })

  it("should handle non-Ethereum address-like strings", () => {
    const string = "ThisIsALongStringThatNeedsShortening"
    const result = shortAddress(string)
    expect(result).toBe("ThisIs...tening")
  })

  it("should handle strings with special characters", () => {
    const string = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`"
    const result = shortAddress(string)
    expect(result.length).toBeGreaterThan(0)
    expect(result).toContain("...")
  })

  it("should always have 3 dots in the middle", () => {
    const address = "0x1234567890123456789012345678901234567890"
    const result = shortAddress(address)
    expect(result.match(/\.\.\./g)?.length).toBe(1)
  })

  it("should preserve checksum case", () => {
    const checksumAddress = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
    const result = shortAddress(checksumAddress)
    expect(result).toBe("0x5aAe...1BeAed")
  })

  it("should work with addresses without 0x prefix", () => {
    const address = "1234567890123456789012345678901234567890"
    const result = shortAddress(address)
    expect(result).toBe("123456...567890")
  })

  it("should handle exact 12 character string", () => {
    const string = "123456789012"
    const result = shortAddress(string)
    expect(result).toBe("123456...789012")
  })

  it("should handle strings shorter than 12 characters", () => {
    const string = "12345"
    const result = shortAddress(string)
    // First 6: '12345' (only 5 chars available, slice gets all)
    // Last 6: '12345' (negative slice gets all)
    expect(result).toBe("12345...12345")
  })
})
