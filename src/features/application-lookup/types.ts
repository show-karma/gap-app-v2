export interface ApplicationLookupResult {
  referenceNumber: string;
  maskedEmail?: string;
  maskedWallet?: string;
  communityName?: string;
  communitySlug?: string;
}

export interface ApplicationLookupError {
  type: "not_found" | "invalid_format" | "network_error";
  message: string;
}
