/**
 * Returns the base URL for the application based on the current environment
 * - Development/Staging: "https://gapstag.karmahq.xyz"
 * - Production: "https://gap.karmahq.xyz"
 */
export const getBaseUrl = (): string => {
  const isDev = process.env.NODE_ENV === "development" ||
                process.env.NEXT_PUBLIC_ENV !== "production";

  return isDev ? "https://gapstag.karmahq.xyz" : "https://gap.karmahq.xyz";
};
