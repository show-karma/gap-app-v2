import { isAddress } from "viem"
import { z } from "zod"

/**
 * Validates that a string is a valid Ethereum address
 * Accepts addresses regardless of checksum casing (EIP-55 is optional)
 */
export const ethereumAddressSchema = z
  .string()
  .trim()
  .min(1, "Contract address is required")
  .refine(
    (address) => {
      // Check if it's a valid Ethereum address format (0x + 40 hex characters)
      // We convert to lowercase to bypass strict checksum validation
      // Both 0xc8270bab... and 0xC8270bab... should be accepted as they're the same address
      return isAddress(address.toLowerCase() as `0x${string}`)
    },
    {
      message: "Must be a valid Ethereum address (0x...)",
    }
  )

/**
 * Validates a network-address pair
 */
export const networkAddressPairSchema = z.object({
  network: z.string().min(1, "Network is required"),
  address: ethereumAddressSchema,
})

/**
 * Validates an array of network-address pairs
 */
export const contractAddressesSchema = z
  .array(networkAddressPairSchema)
  .min(1, "At least one contract address is required")

/**
 * Type for a validated network-address pair
 */
export type ValidatedNetworkAddressPair = z.infer<typeof networkAddressPairSchema>

/**
 * Validates a single contract address and returns validation result
 */
export const validateContractAddress = (
  address: string
): {
  isValid: boolean
  error?: string
} => {
  try {
    ethereumAddressSchema.parse(address)
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message || "Invalid address",
      }
    }
    return { isValid: false, error: "Invalid address" }
  }
}

/**
 * Validates a network-address pair and returns validation result
 */
export const validateNetworkAddressPair = (
  network: string,
  address: string
): {
  isValid: boolean
  errors?: {
    network?: string
    address?: string
  }
} => {
  try {
    networkAddressPairSchema.parse({ network, address })
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: { network?: string; address?: string } = {}
      error.errors.forEach((err) => {
        const field = err.path[0] as "network" | "address"
        if (field) {
          errors[field] = err.message
        }
      })
      return { isValid: false, errors }
    }
    return { isValid: false }
  }
}
