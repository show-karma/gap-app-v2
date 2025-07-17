// Application-wide constants

export const APP_NAME = "GAP - Grantee Accountability Protocol";
export const APP_DESCRIPTION = "Track grant progress and impact on-chain";

// Zero UID constant
export const ZERO_UID =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// API Configuration
export const API_TIMEOUT = 360000; // 6 minutes
export const DEFAULT_PAGE_SIZE = 20;

// File Upload Limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Web3 Constants
export const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;

// Feature Flags
export const FEATURES = {
  OSO_METRICS: true,
  KARMA_AI: true,
  SAFE_INTEGRATION: true,
} as const;

// External Links
export const EXTERNAL_LINKS = {
  TELEGRAM: "https://t.me/karmahq",
  GITHUB: "https://github.com/show-karma/gap-app-v2",
  DOCS: "https://docs.karmahq.xyz",
} as const;