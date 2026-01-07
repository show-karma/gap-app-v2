/**
 * Shared validation utilities for the application
 * Centralizes validation logic to ensure consistency and reduce duplication
 */

/**
 * Validates an Ethereum wallet address format
 * @param address - The wallet address to validate
 * @returns true if valid, false otherwise
 */
export function validateWalletAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }
  // Check if it's a valid Ethereum address (0x followed by 40 hex characters)
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address.trim());
}

/**
 * Validates an email address format
 * @param email - The email to validate
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  // Basic email validation - checks for @ and domain
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates a Telegram handle format
 * @param telegram - The Telegram handle to validate
 * @returns true if valid, false otherwise
 */
export function validateTelegram(telegram: string): boolean {
  if (!telegram || typeof telegram !== "string") {
    return false;
  }
  // Telegram usernames are 5-32 characters, alphanumeric and underscores
  // Can optionally start with @
  const telegramRegex = /^@?[a-zA-Z0-9_]{5,32}$/;
  return telegramRegex.test(telegram.trim());
}

/**
 * Validates a program ID format (alphanumeric with optional dashes/underscores)
 * @param programId - The program ID to validate
 * @returns true if valid, false otherwise
 */
export function validateProgramId(programId: string): boolean {
  if (!programId || typeof programId !== "string") {
    return false;
  }
  // Program IDs should be alphanumeric with optional hyphens and underscores
  // Typically hex strings or UUIDs
  const programIdRegex = /^[a-zA-Z0-9_-]+$/;
  return programIdRegex.test(programId.trim()) && programId.length > 0;
}

/**
 * Validates a chain ID (must be a positive integer)
 * @param chainID - The chain ID to validate
 * @returns true if valid, false otherwise
 */
export function validateChainId(chainID: number | string): boolean {
  if (typeof chainID === "number") {
    return Number.isInteger(chainID) && chainID > 0;
  }
  if (typeof chainID === "string") {
    const parsed = parseInt(chainID, 10);
    return !Number.isNaN(parsed) && parsed > 0 && parsed.toString() === chainID.trim();
  }
  return false;
}

/**
 * Validates a program identifier
 * Accepts both formats:
 * - Normalized: "986" (programId only, preferred format)
 * - Composite: "986_42161" (programId_chainID, backward compatibility)
 * @param combinedId - The identifier to validate
 * @returns Object with validation result and parsed components
 */
export function validateProgramIdentifier(combinedId: string): {
  valid: boolean;
  programId?: string;
  chainID?: number;
  error?: string;
} {
  if (!combinedId || typeof combinedId !== "string") {
    return { valid: false, error: "Invalid program identifier format" };
  }

  const trimmedId = combinedId.trim();
  const parts = trimmedId.split("_");

  // Handle normalized format (just programId, no chainId)
  if (parts.length === 1) {
    const programId = parts[0];
    if (!validateProgramId(programId)) {
      return {
        valid: false,
        error: "Invalid program ID format",
      };
    }
    return {
      valid: true,
      programId,
      chainID: undefined, // chainID is optional for normalized format
    };
  }

  // Handle composite format (programId_chainID) for backward compatibility
  if (parts.length === 2) {
    const [programId, chainIdStr] = parts;

    if (!validateProgramId(programId)) {
      return {
        valid: false,
        error: "Invalid program ID format",
      };
    }

    if (!validateChainId(chainIdStr)) {
      return {
        valid: false,
        error: "Invalid chain ID format",
      };
    }

    return {
      valid: true,
      programId,
      chainID: parseInt(chainIdStr, 10),
    };
  }

  // Invalid format (more than one underscore)
  return {
    valid: false,
    error: "Program identifier must be in format: programId or programId_chainID",
  };
}

/**
 * Validates an array of program identifiers
 * Accepts both normalized (programId) and composite (programId_chainID) formats
 * @param programIds - Array of program identifiers to validate
 * @returns Object with validation result and errors
 */
export function validateProgramIdentifiers(programIds: string[]): {
  valid: boolean;
  validIds: Array<{ programId: string; chainID?: number }>;
  errors: Array<{ id: string; error: string }>;
} {
  if (!Array.isArray(programIds)) {
    return {
      valid: false,
      validIds: [],
      errors: [{ id: "input", error: "Program IDs must be an array" }],
    };
  }

  const validIds: Array<{ programId: string; chainID?: number }> = [];
  const errors: Array<{ id: string; error: string }> = [];

  programIds.forEach((id) => {
    const result = validateProgramIdentifier(id);
    if (result.valid && result.programId) {
      // Accept both formats: normalized (no chainID) and composite (with chainID)
      validIds.push({ 
        programId: result.programId, 
        chainID: result.chainID // chainID is optional for normalized format
      });
    } else {
      errors.push({ id, error: result.error || "Invalid format" });
    }
  });

  return {
    valid: errors.length === 0,
    validIds,
    errors,
  };
}

/**
 * Parses a reviewer member ID in format: role-publicAddress
 * @param memberId - The member ID to parse
 * @returns Object with parsing result and components
 */
export function parseReviewerMemberId(memberId: string): {
  valid: boolean;
  role?: "program" | "milestone";
  publicAddress?: string;
  error?: string;
} {
  if (!memberId || typeof memberId !== "string") {
    return { valid: false, error: "Invalid member ID" };
  }

  // Find the first hyphen to split role and address
  const hyphenIndex = memberId.indexOf("-");

  if (hyphenIndex === -1) {
    return {
      valid: false,
      error: "Member ID must be in format: role-publicAddress",
    };
  }

  const role = memberId.substring(0, hyphenIndex);
  const publicAddress = memberId.substring(hyphenIndex + 1);

  // Validate role is one of the known types
  if (role !== "program" && role !== "milestone") {
    return {
      valid: false,
      error: `Invalid role: ${role}. Must be 'program' or 'milestone'`,
    };
  }

  // Validate public address format
  if (!validateWalletAddress(publicAddress)) {
    return {
      valid: false,
      error: "Invalid wallet address in member ID",
    };
  }

  return {
    valid: true,
    role: role as "program" | "milestone",
    publicAddress,
  };
}

/**
 * Sanitizes a string to prevent XSS attacks
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  // Remove any HTML tags and trim whitespace
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validates reviewer data before submission
 * @param data - Reviewer data to validate
 * @returns Object with validation result and errors
 */
export function validateReviewerData(data: {
  publicAddress: string;
  name: string;
  email: string;
  telegram?: string;
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.publicAddress) {
    errors.push("Wallet address is required");
  } else if (!validateWalletAddress(data.publicAddress)) {
    errors.push("Invalid wallet address format");
  }

  if (!data.name || !data.name.trim()) {
    errors.push("Name is required");
  } else if (data.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters");
  } else if (data.name.trim().length > 100) {
    errors.push("Name must be less than 100 characters");
  }

  if (!data.email) {
    errors.push("Email is required");
  } else if (!validateEmail(data.email)) {
    errors.push("Invalid email format");
  }

  if (data.telegram && !validateTelegram(data.telegram)) {
    errors.push("Invalid Telegram handle format (5-32 alphanumeric characters, optional @ prefix)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
