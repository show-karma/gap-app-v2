import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AIEvaluationData } from "@/src/features/applications/components/AIEvaluationDisplay";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { captureWithContext } from "@/utilities/sentry-capture";

const COMPONENT_TAG = "useRealTimeAIEvaluation";

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

type AIEvaluationErrorCause = "auth" | "http" | "parse";

interface AIEvaluationErrorOptions {
  cause: AIEvaluationErrorCause;
  status?: number;
  statusText?: string;
}

export class AIEvaluationError extends Error {
  readonly cause: AIEvaluationErrorCause;
  readonly status?: number;
  readonly statusText?: string;

  constructor(message: string, options: AIEvaluationErrorOptions) {
    super(message);
    this.name = "AIEvaluationError";
    this.cause = options.cause;
    this.status = options.status;
    this.statusText = options.statusText;
  }
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
    captureWithContext(error, COMPONENT_TAG, "ai-realtime-evaluation-auth-header-failed", {
      programId,
    });
    throw new AIEvaluationError(AI_EVALUATION_AUTH_MESSAGE, { cause: "auth" });
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
          component: COMPONENT_TAG,
          errorId: "ai-realtime-evaluation-auth-rejected",
        },
        extra: { programId, status: response.status },
      });
      throw new AIEvaluationError(AI_EVALUATION_AUTH_MESSAGE, { cause: "auth" });
    }
    throw new AIEvaluationError(AI_EVALUATION_UNAVAILABLE_MESSAGE, {
      cause: "http",
      status: response.status,
      statusText: response.statusText,
    });
  }

  try {
    return await response.json();
  } catch (error) {
    captureWithContext(error, COMPONENT_TAG, "ai-realtime-evaluation-json-parse-failed", {
      programId,
      status: response.status,
    });
    throw new AIEvaluationError(AI_EVALUATION_UNAVAILABLE_MESSAGE, { cause: "parse" });
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
          const isAIError = err instanceof AIEvaluationError;
          const message = isAIError ? err.message : AI_EVALUATION_UNAVAILABLE_MESSAGE;
          // auth/parse paths are already logged at the throw site — skip to avoid double-reporting.
          const alreadyLogged = isAIError && (err.cause === "auth" || err.cause === "parse");
          if (!alreadyLogged) {
            const extra: Record<string, unknown> = {
              programId,
              applicationDataKeys: Object.keys(applicationData),
            };
            if (isAIError && err.cause === "http") {
              extra.status = err.status;
              extra.statusText = err.statusText;
            }
            captureWithContext(err, COMPONENT_TAG, "ai-realtime-evaluation-request-failed", extra);
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

  // Abort any pending debounce + in-flight request whenever the hook's inputs
  // change (or on unmount), so a result for a previous programId / isEnabled /
  // debounceMs cannot land and overwrite state under the new config.
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      lastEvaluationRef.current = "";
    };
  }, [programId, isEnabled, debounceMs]);

  return {
    evaluation,
    evaluationResponse,
    isLoading,
    error,
    triggerEvaluation,
    clearEvaluation,
  };
}
