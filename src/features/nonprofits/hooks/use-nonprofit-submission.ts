"use client";

import { useMutation } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface NonprofitSubmissionPayload {
  websiteUrl: string;
  email: string;
  phone?: string;
}

interface NonprofitSubmissionResponse {
  id: string;
  createdAt: string;
}

/**
 * Submits a nonprofit's website + contact info to the gap-indexer.
 * The backend persists the row in Postgres and emails the team so
 * we can reach out for any missing detail before publishing the
 * funder-facing profile.
 *
 * Public endpoint: no auth header required.
 */
export function useNonprofitSubmission() {
  return useMutation({
    mutationFn: async (payload: NonprofitSubmissionPayload) => {
      const [data, error, , status] = await fetchData<NonprofitSubmissionResponse>(
        INDEXER.NONPROFITS.SUBMIT,
        "POST",
        payload,
        {},
        {},
        false
      );
      if (error || !data) {
        throw new Error(error ?? `Submission failed with status ${status}`);
      }
      return data;
    },
  });
}
