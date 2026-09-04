import { Spinner } from "@/components/Utilities/Spinner";

export default function Loading() {
  return (
    <output
      aria-live="polite"
      aria-label="Loading send email"
      className="flex items-center justify-center min-h-screen"
    >
      <Spinner />
    </output>
  );
}
