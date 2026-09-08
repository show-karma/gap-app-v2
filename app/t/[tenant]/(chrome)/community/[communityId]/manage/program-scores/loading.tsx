import { Spinner } from "@/components/Utilities/Spinner";

export default function Loading() {
  return (
    <output aria-label="Loading" className="flex items-center justify-center min-h-screen">
      <Spinner />
    </output>
  );
}
