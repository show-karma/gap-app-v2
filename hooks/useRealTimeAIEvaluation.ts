import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { AIEvaluationData } from '@/components/FundingPlatform/AIEvaluationDisplay';

interface UseRealTimeAIEvaluationProps {
  programId: string;
  chainId: number;
  isEnabled: boolean;
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
  isEnabled
}: UseRealTimeAIEvaluationProps) {
  const [evaluation, setEvaluation] = useState<AIEvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEvaluationRef = useRef<string>('');
  
  // Use refs to store current values to avoid recreating the callback
  const configRef = useRef({ programId, chainId, isEnabled });
  configRef.current = { programId, chainId, isEnabled };

  const triggerEvaluation = useCallback(async (applicationData: Record<string, any>) => {
    const { programId: currentProgramId, chainId: currentChainId, isEnabled: currentIsEnabled } = configRef.current;
    
    if (!currentIsEnabled || !currentProgramId || !currentChainId) {
      return;
    }

    // Create a hash of the current data to avoid duplicate evaluations
    const dataHash = JSON.stringify(applicationData);
    if (dataHash === lastEvaluationRef.current) {
      return;
    }

    // Clear any existing timeout from previous calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // No need for debouncing since blur events are naturally debounced by user action
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post<RealTimeEvaluationResponse>(
        `/grant-programs/${currentProgramId}/${currentChainId}/evaluate-realtime`,
        { applicationData }
      );

      if (response.data.success) {
        setEvaluation(response.data.data);
        lastEvaluationRef.current = dataHash;
      } else {
        setError('AI response failed');
      }
    } catch (err: any) {
      console.error('AI evaluation failed:', err.response?.data?.message || err.message);
      setError('AI response failed');
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies - use refs instead

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