import { Spinner } from "@/components/Utilities/Spinner";

export default function Loading() {
  return (
    <output aria-label="Loading" className="flex w-full items-center min-h-[400px] justify-center">
      <Spinner />
    </output>
  );
}
