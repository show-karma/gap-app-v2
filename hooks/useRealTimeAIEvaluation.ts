import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
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

  const triggerEvaluation = useCallback(async (applicationData: Record<string, any>) => {
    if (!isEnabled || !programId || !chainId) {
      return;
    }

    // Create a hash of the current data to avoid duplicate evaluations
    const dataHash = JSON.stringify(applicationData);
    if (dataHash === lastEvaluationRef.current) {
      return;
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
      try {
        const response = await apiClient.post<RealTimeEvaluationResponse>(
          `/grant-programs/${programId}/${chainId}/evaluate-realtime`,
          { applicationData }
        );

        if (response.data.success) {
          setEvaluation(response.data.data);
          lastEvaluationRef.current = dataHash;
        } else {
          throw new Error('Evaluation failed');
        }
      } catch (err: any) {
        console.error('Real-time evaluation error:', err);
        setError(err.response?.data?.message || 'Failed to evaluate application');
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [programId, chainId, isEnabled, debounceMs]);

  const clearEvaluation = useCallback(() => {
    setEvaluation(null);
    setError(null);
    lastEvaluationRef.current = '';
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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