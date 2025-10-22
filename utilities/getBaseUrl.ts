import { envVars } from "./enviromentVars";

/**
 * Returns the base URL for the application based on the current environment
 * @returns The base URL (e.g., "https://gap.karmahq.xyz" for production, "https://gapstag.karmahq.xyz" for staging)
 */
export const getBaseUrl = (): string => {
  return envVars.VERCEL_URL;
};
