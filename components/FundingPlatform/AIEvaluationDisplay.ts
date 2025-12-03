export interface AIEvaluationData {
  rating: number;
  feedback: string;
  suggestions: string[];
  isComplete: boolean;
  evaluatedAt: string;
  model: string;
}

interface AIEvaluationDisplayProps {
  evaluation: AIEvaluationData | null;
  isLoading: boolean;
  isEnabled: boolean;
  className?: string;
}
