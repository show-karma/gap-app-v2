/**
 * Returns the base URL for the application based on the current environment
 * - Development/Staging: "https://staging.karmahq.xyz"
 * - Production: "https://karmahq.xyz"
 */
export const getBaseUrl = (): string => {
  const isDev =
    process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENV !== "production"

  return isDev ? "https://staging.karmahq.xyz" : "https://karmahq.xyz"
}
