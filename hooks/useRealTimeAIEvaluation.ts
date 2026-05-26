import * as Sentry from "@sentry/nextjs";
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

export const AI_EVALUATION_TIMEOUT_MS = 30_000;

const AI_EVALUATION_UNAVAILABLE_MESSAGE =
  "AI feedback is unavailable right now. You can submit your application without it.";
const AI_EVALUATION_TIMEOUT_MESSAGE =
  "AI feedback is taking longer than expected. You can submit your application without it.";
const AI_EVALUATION_AUTH_MESSAGE =
  "Please reconnect your wallet to get AI feedback, or submit your application without it.";

class AIEvaluationAuthError extends Error {
  constructor() {
    super(AI_EVALUATION_AUTH_MESSAGE);
    this.name = "AIEvaluationAuthError";
    Object.setPrototypeOf(this, AIEvaluationAuthError.prototype);
  }
}

class AIEvaluationHttpError extends Error {
  status: number;
  statusText: string;

  constructor(status: number, statusText: string) {
    super(AI_EVALUATION_UNAVAILABLE_MESSAGE);
    this.name = "AIEvaluationHttpError";
    this.status = status;
    this.statusText = statusText;
    Object.setPrototypeOf(this, AIEvaluationHttpError.prototype);
  }
}

class AIEvaluationParseError extends Error {
  constructor() {
    super(AI_EVALUATION_UNAVAILABLE_MESSAGE);
    this.name = "AIEvaluationParseError";
    Object.setPrototypeOf(this, AIEvaluationParseError.prototype);
  }
}

function logAIEvaluationError(error: unknown, errorId: string, extra?: Record<string, unknown>) {
  Sentry.captureException(error, {
    tags: {
      component: "useRealTimeAIEvaluation",
      errorId,
    },
    extra,
  });
}

async function evaluateApplication(
  programId: string,
  applicationData: Record<string, unknown>,
  signal?: AbortSignal
): Promise<RealTimeEvaluationResponse> {
  let authHeaders: Record<string, string>;
  try {
    authHeaders = await TokenManager.getAuthHeader();
  } catch (error) {
    logAIEvaluationError(error, "ai-realtime-evaluation-auth-header-failed", { programId });
    throw new AIEvaluationAuthError();
  }

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
    if (response.status === 401 || response.status === 403) {
      Sentry.captureMessage("AI evaluation auth rejected by server", {
        level: "info",
        tags: {
          component: "useRealTimeAIEvaluation",
          errorId: "ai-realtime-evaluation-auth-rejected",
        },
        extra: { programId, status: response.status },
      });
      throw new AIEvaluationAuthError();
    }
    throw new AIEvaluationHttpError(response.status, response.statusText);
  }

  try {
    return await response.json();
  } catch (error) {
    logAIEvaluationError(error, "ai-realtime-evaluation-json-parse-failed", {
      programId,
      status: response.status,
    });
    throw new AIEvaluationParseError();
  }
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
  const supersededControllersRef = useRef<WeakSet<AbortController>>(new WeakSet());

  const triggerEvaluation = useCallback(
    async (applicationData: Record<string, unknown>) => {
      if (!isEnabled || !programId) return;

      const dataHash = JSON.stringify(applicationData);
      if (dataHash === lastEvaluationRef.current) return;

      if (abortControllerRef.current) {
        supersededControllersRef.current.add(abortControllerRef.current);
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        let didTimeout = false;
        const timeoutId = setTimeout(() => {
          didTimeout = true;
          controller.abort();
        }, AI_EVALUATION_TIMEOUT_MS);

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
            throw new Error(AI_EVALUATION_UNAVAILABLE_MESSAGE);
          }
        } catch (err) {
          if (controller.signal.aborted && didTimeout) {
            setError(AI_EVALUATION_TIMEOUT_MESSAGE);
            return;
          }
          if (controller.signal.aborted) return;
          const isTypedAIError =
            err instanceof AIEvaluationAuthError ||
            err instanceof AIEvaluationHttpError ||
            err instanceof AIEvaluationParseError;
          const message =
            isTypedAIError && err instanceof Error
              ? err.message
              : AI_EVALUATION_UNAVAILABLE_MESSAGE;
          const alreadyLogged =
            err instanceof AIEvaluationAuthError || err instanceof AIEvaluationParseError;
          if (!alreadyLogged) {
            const extra: Record<string, unknown> = {
              programId,
              applicationDataKeys: Object.keys(applicationData),
            };
            if (err instanceof AIEvaluationHttpError) {
              extra.status = err.status;
              extra.statusText = err.statusText;
            }
            logAIEvaluationError(err, "ai-realtime-evaluation-request-failed", extra);
          }
          setError(message);
        } finally {
          clearTimeout(timeoutId);
          const wasSuperseded = supersededControllersRef.current.has(controller);
          const hasReplacementRequest =
            abortControllerRef.current !== null && abortControllerRef.current !== controller;
          if (!wasSuperseded && !hasReplacementRequest) {
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
