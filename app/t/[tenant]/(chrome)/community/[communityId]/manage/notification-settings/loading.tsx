import { Spinner } from "@/components/Utilities/Spinner";

export default function Loading() {
  // `role="status"` carries implicit `aria-live="polite"`. `<output>` is a
  // form-result element — wrong semantics for a page-level spinner, even
  // though Biome's useSemanticElements rule doesn't distinguish the contexts.
  return (
    // biome-ignore lint/a11y/useSemanticElements: <output> is for form calculation results, not loading spinners
    <div
      role="status"
      aria-label="Loading notification settings"
      className="flex items-center justify-center min-h-screen"
    >
      <Spinner />
    </div>
  );
}
