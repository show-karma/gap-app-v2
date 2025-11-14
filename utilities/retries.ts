import { errorManager } from "@/components/Utilities/errorManager"

/**
 * Retries a function with exponential backoff
 * @param operation The async function to retry
 * @param maxRetries The maximum number of retries
 * @param initialDelay The initial delay in milliseconds
 * @param maxDelay The maximum delay in milliseconds
 * @returns The result of the operation, or throws an error if all retries fail
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 1000,
  maxDelay: number = 30000,
  backoff: number = 1
): Promise<T> {
  let retries = 0
  let delay = initialDelay

  while (retries < maxRetries) {
    try {
      return await operation()
    } catch (error) {
      retries++
      if (retries >= maxRetries) {
        errorManager(`Operation failed after ${maxRetries} retries`, error)
        throw error
      }

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoff, maxDelay)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error("Unexpected end of retry loop")
}

export const retryUntilConditionMet = async (
  conditionFn: () => Promise<boolean>,
  callbackFn?: () => void,
  maxRetries: number = 1000,
  delay: number = 1500
) => {
  let retries = maxRetries
  while (retries > 0) {
    try {
      const conditionMet = await conditionFn().catch(() => false)
      if (conditionMet) {
        callbackFn?.()
        return
      }
    } catch (error) {
      console.error("Error checking condition:", error)
    }
    retries -= 1
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
}
