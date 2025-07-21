import { useState, useCallback, useRef, useEffect } from 'react';
import axios, { CancelTokenSource } from 'axios';
import { AIEvaluationData } from '@/components/FundingPlatform/AIEvaluationDisplay';

interface UseRealTimeAIEvaluationProps {
  programId: string;
  chainId: number;
  isEnabled: boolean;
  debounceMs?: number;
}

interface RealTimeEvaluationResponse {
  success: boolean;
  data: AIEvaluationData;
}

// Create API client similar to funding platform service
const API_BASE = process.env.NEXT_PUBLIC_GAP_INDEXER_URL || 'http://localhost:4000';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function useRealTimeAIEvaluation({
  programId,
  chainId,
  isEnabled,
  debounceMs = 2000
}: UseRealTimeAIEvaluationProps) {
  const [evaluation, setEvaluation] = useState<AIEvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEvaluationRef = useRef<string>('');
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  const triggerEvaluation = useCallback(async (applicationData: Record<string, any>) => {
    if (!isEnabled || !programId || !chainId) {
      return;
    }

    // Create a hash of the current data to avoid duplicate evaluations
    const dataHash = JSON.stringify(applicationData);
    if (dataHash === lastEvaluationRef.current) {
      return;
    }

    // Cancel any pending requests
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('New evaluation triggered');
    }

    // Clear any existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set loading state immediately
    setIsLoading(true);
    setError(null);

    // Debounce the actual API call
    debounceRef.current = setTimeout(async () => {
      let isCancelled = false;
      
      try {
        // Create new cancel token
        cancelTokenRef.current = axios.CancelToken.source();

        const response = await apiClient.post<RealTimeEvaluationResponse>(
          `/grant-programs/${programId}/${chainId}/evaluate-realtime`,
          { applicationData },
          { cancelToken: cancelTokenRef.current.token }
        );

        if (response.data.success) {
          setEvaluation(response.data.data);
          lastEvaluationRef.current = dataHash;
        } else {
          throw new Error('Evaluation failed');
        }
      } catch (err: any) {
        // Check if the request was cancelled
        if (axios.isCancel(err)) {
          console.log('Real-time evaluation request cancelled:', err.message);
          isCancelled = true;
          // Don't set error state for cancelled requests
          return;
        }
        
        console.error('Real-time evaluation error:', err);
        setError(err.response?.data?.message || 'Failed to evaluate application');
      } finally {
        // Only clear loading state if the request wasn't cancelled
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }, debounceMs);
  }, [programId, chainId, isEnabled, debounceMs]);

  const clearEvaluation = useCallback(() => {
    setEvaluation(null);
    setError(null);
    lastEvaluationRef.current = '';
    
    // Cancel any pending requests
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Evaluation cleared');
    }
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending requests on unmount
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
      
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    evaluation,
    isLoading,
    error,
    triggerEvaluation,
    clearEvaluation,
  };
} 