"use client";

import { useState } from "react";
import fetchData from "@/utilities/fetchData";
import type { ApplicationLookupError, ApplicationLookupResult } from "../types";

const REFERENCE_NUMBER_PATTERN = /^APP-[A-Z0-9]{8}-[A-Z0-9]{6}$/;

function validateReferenceNumber(referenceNumber: string): boolean {
  return REFERENCE_NUMBER_PATTERN.test(referenceNumber);
}

interface UseApplicationLookupReturn {
  lookupApplication: (referenceNumber: string) => Promise<void>;
  result: ApplicationLookupResult | null;
  error: ApplicationLookupError | null;
  isLoading: boolean;
  reset: () => void;
}

export function useApplicationLookup(): UseApplicationLookupReturn {
  const [result, setResult] = useState<ApplicationLookupResult | null>(null);
  const [error, setError] = useState<ApplicationLookupError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lookupApplication = async (referenceNumber: string) => {
    setResult(null);
    setError(null);

    if (!validateReferenceNumber(referenceNumber)) {
      setError({
        type: "invalid_format",
        message:
          "Invalid reference number format. Expected format: APP-XXXXXXXX-XXXXXX",
      });
      return;
    }

    setIsLoading(true);

    try {
      const [data, fetchError] = await fetchData<ApplicationLookupResult>(
        `/v2/funding-applications/lookup-credential/${referenceNumber}`,
        "GET",
        {},
        {},
        {},
        false
      );

      if (fetchError || !data) {
        setError({
          type: "not_found",
          message:
            typeof fetchError === "string"
              ? fetchError
              : `Funding application with reference number ${referenceNumber} not found`,
        });
        return;
      }

      setResult({
        referenceNumber: data.referenceNumber,
        maskedEmail: data.maskedEmail,
        maskedWallet: data.maskedWallet,
        communityName: data.communityName,
        communitySlug: data.communitySlug,
      });
    } catch {
      setError({
        type: "network_error",
        message:
          "Unable to lookup application. Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  return {
    lookupApplication,
    result,
    error,
    isLoading,
    reset,
  };
}
