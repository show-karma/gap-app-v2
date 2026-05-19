import { ErrorState } from "./EmptyState";

interface Props {
  onRetry?: () => void;
}

/** Shared product-language error component for any AI agent connectivity failure. */
export function TeamErrorState({ onRetry }: Props) {
  return (
    <ErrorState
      title="Your team didn't respond"
      body="Your team didn't respond. Check your connection, then retry."
      onRetry={onRetry}
    />
  );
}
