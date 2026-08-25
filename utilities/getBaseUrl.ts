import { appOrigin } from "@/utilities/domains";

/**
 * Returns the canonical base URL for the application based on the current environment
 * - Development/Staging: STAGING_ORIGIN
 * - Production: CANONICAL_ORIGIN
 */
export const getBaseUrl = (): string => appOrigin();
