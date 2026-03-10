import { Spinner } from "@/components/Utilities/Spinner";

export default function Loading() {
  return (
    <output
      aria-live="polite"
      aria-label="Loading email grantees"
      className="flex items-center justify-center min-h-screen"
    >
      <Spinner />
    </output>
  );
}
