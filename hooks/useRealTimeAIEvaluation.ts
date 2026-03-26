import { useCallback, useEffect, useRef, useState } from "react";
import type { AIEvaluationData } from "@/src/features/applications/components/AIEvaluationDisplay";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";

interface UseRealTimeAIEvaluationProps {
  programId: string;
  isEnabled: boolean;
  debounceMs?: number;
}

interface RealTimeEvaluationResponse {
  success: boolean;
  data: AIEvaluationData;
  promptId: string;
}

async function evaluateApplication(
  programId: string,
  applicationData: Record<string, unknown>,
  signal?: AbortSignal
): Promise<RealTimeEvaluationResponse> {
  const authHeaders = await TokenManager.getAuthHeader();
  const apiBase = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

  const response = await fetch(
    `${apiBase}/v2/funding-applications/${programId}/evaluate-realtime`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ applicationData }),
      signal,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to evaluate application");
  }

  return response.json();
}

export function useRealTimeAIEvaluation({
  programId,
  isEnabled,
  debounceMs = 2000,
}: UseRealTimeAIEvaluationProps) {
  const [evaluation, setEvaluation] = useState<AIEvaluationData | null>(null);
  const [evaluationResponse, setEvaluationResponse] = useState<RealTimeEvaluationResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEvaluationRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const triggerEvaluation = useCallback(
    async (applicationData: Record<string, unknown>) => {
      if (!isEnabled || !programId) return;

      const dataHash = JSON.stringify(applicationData);
      if (dataHash === lastEvaluationRef.current) return;

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      // FIX: setIsLoading INSIDE debounce — prevents spinner on every keystroke
      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // FIX: 15s hard timeout via AbortController
        const timeoutId = setTimeout(() => controller.abort(), 15_000);

        setIsLoading(true);
        setError(null);

        try {
          const response = await evaluateApplication(programId, applicationData, controller.signal);

          if (controller.signal.aborted) return;

          if (response.success) {
            setEvaluation(response.data);
            setEvaluationResponse(response);
            lastEvaluationRef.current = dataHash;
          } else {
            throw new Error("Evaluation failed");
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            setError("AI evaluation timed out. You can submit without it.");
            return;
          }
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : "Failed to evaluate application";
          setError(message);
        } finally {
          clearTimeout(timeoutId);
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
        }
      }, debounceMs);
    },
    [programId, isEnabled, debounceMs]
  );

  const clearEvaluation = useCallback(() => {
    setEvaluation(null);
    setEvaluationResponse(null);
    setError(null);
    lastEvaluationRef.current = "";

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setIsLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    evaluation,
    evaluationResponse,
    isLoading,
    error,
    triggerEvaluation,
    clearEvaluation,
  };
}
