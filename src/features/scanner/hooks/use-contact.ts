"use client";

import { useMutation } from "@tanstack/react-query";
import { submitContactRequest } from "../services/scanner.service";
import type { ContactRequest } from "../types";

interface UseContactOptions {
  onSuccess?: () => void;
  onError?: (error: Error & { status?: number }) => void;
}

export function useContact(options: UseContactOptions = {}) {
  return useMutation<{ id: string }, Error & { status?: number }, ContactRequest>({
    mutationFn: submitContactRequest,
    onSuccess: () => options.onSuccess?.(),
    onError: options.onError,
  });
}
