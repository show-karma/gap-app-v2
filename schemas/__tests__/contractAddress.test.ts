import {
  ethereumAddressSchema,
  networkAddressPairSchema,
  validateContractAddress,
  validateNetworkAddressPair,
} from "../contractAddress"

describe("Contract Address Validation", () => {
  describe("validateContractAddress", () => {
    it("should validate a correct Ethereum address", () => {
      // USDT contract address
      const result = validateContractAddress("0xdAC17F958D2ee523a2206206994597C13D831ec7")
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it("should validate a correct checksummed address", () => {
      // USDC contract address
      const result = validateContractAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
      expect(result.isValid).toBe(true)
    })

    it("should reject an address without 0x prefix", () => {
      const result = validateContractAddress("dAC17F958D2ee523a2206206994597C13D831ec7")
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should reject an address with invalid length", () => {
      const result = validateContractAddress("0x123")
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should reject an address with invalid characters", () => {
      const result = validateContractAddress("0xZZZd35Cc6634C0532925a3b844Bc9e7595f0bEb")
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should reject an empty address", () => {
      const result = validateContractAddress("")
      expect(result.isValid).toBe(false)
      expect(result.error).toBe("Contract address is required")
    })

    it("should trim whitespace and validate", () => {
      // Trim and validate USDT address
      const result = validateContractAddress("  0xdAC17F958D2ee523a2206206994597C13D831ec7  ")
      expect(result.isValid).toBe(true)
    })

    it("should accept lowercase address", () => {
      // viem accepts lowercase addresses - using USDT in lowercase
      const result = validateContractAddress("0xdac17f958d2ee523a2206206994597c13d831ec7")
      expect(result.isValid).toBe(true)
    })

    it("should accept addresses with different checksum casing", () => {
      // Both of these should be accepted as they're the same address
      const lowercase = validateContractAddress("0xc8270bab6fb8035ece604af42f200ee02c56a916")
      const mixedCase = validateContractAddress("0xC8270bab6Fb8035eCe604Af42f200eE02C56a916")

      expect(lowercase.isValid).toBe(true)
      expect(mixedCase.isValid).toBe(true)
    })

    it("should accept all uppercase hex characters", () => {
      const result = validateContractAddress("0xDAC17F958D2EE523A2206206994597C13D831EC7")
      expect(result.isValid).toBe(true)
    })
  })

  describe("validateNetworkAddressPair", () => {
    it("should validate a correct network-address pair", () => {
      const result = validateNetworkAddressPair(
        "optimism",
        "0xdAC17F958D2ee523a2206206994597C13D831ec7"
      )
      expect(result.isValid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it("should reject a pair with empty network", () => {
      const result = validateNetworkAddressPair("", "0xdAC17F958D2ee523a2206206994597C13D831ec7")
      expect(result.isValid).toBe(false)
      expect(result.errors?.network).toBe("Network is required")
    })

    it("should reject a pair with invalid address", () => {
      const result = validateNetworkAddressPair("optimism", "0x123")
      expect(result.isValid).toBe(false)
      expect(result.errors?.address).toBeDefined()
    })

    it("should reject a pair with both fields invalid", () => {
      const result = validateNetworkAddressPair("", "0x123")
      expect(result.isValid).toBe(false)
      expect(result.errors?.network).toBeDefined()
      expect(result.errors?.address).toBeDefined()
    })
  })

  describe("ethereumAddressSchema", () => {
    it("should parse a valid address", () => {
      expect(() =>
        ethereumAddressSchema.parse("0xdAC17F958D2ee523a2206206994597C13D831ec7")
      ).not.toThrow()
    })

    it("should throw on invalid address", () => {
      expect(() => ethereumAddressSchema.parse("0x123")).toThrow()
    })

    it("should trim and parse", () => {
      const result = ethereumAddressSchema.parse("  0xdAC17F958D2ee523a2206206994597C13D831ec7  ")
      expect(result).toBe("0xdAC17F958D2ee523a2206206994597C13D831ec7")
    })
  })

  describe("networkAddressPairSchema", () => {
    it("should parse a valid pair", () => {
      const result = networkAddressPairSchema.parse({
        network: "optimism",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      })
      expect(result.network).toBe("optimism")
      expect(result.address).toBe("0xdAC17F958D2ee523a2206206994597C13D831ec7")
    })

    it("should throw on invalid pair", () => {
      expect(() =>
        networkAddressPairSchema.parse({
          network: "",
          address: "0x123",
        })
      ).toThrow()
    })
  })

  describe("Real-world Ethereum addresses", () => {
    const validAddresses = [
      "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT contract
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC contract
      "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI contract
      "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI contract
      "0x0000000000000000000000000000000000000000", // Zero address (technically valid)
    ]

    it.each(validAddresses)("should validate real Ethereum address: %s", (address: string) => {
      const result = validateContractAddress(address)
      expect(result.isValid).toBe(true)
    })

    const invalidAddresses = [
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bE", // Too short
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbZ", // Invalid character
      "742d35Cc6634C0532925a3b844Bc9e7595f0bEb", // Missing 0x
      "0xGGGG35Cc6634C0532925a3b844Bc9e7595f0bEb", // Invalid hex
      "", // Empty
      "0x", // Just prefix
    ]

    it.each(invalidAddresses)("should reject invalid Ethereum address: %s", (address: string) => {
      const result = validateContractAddress(address)
      expect(result.isValid).toBe(false)
    })
  })
})
