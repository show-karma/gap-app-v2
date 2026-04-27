import { Spinner } from "@/components/Utilities/Spinner";

export default function Loading() {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <output> is for form calculation results, not loading spinners
    <div
      role="status"
      aria-label="Loading knowledge base"
      className="flex items-center justify-center min-h-screen"
    >
      <Spinner />
    </div>
  );
}
