import { Spinner } from "@/components/Utilities/Spinner";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner />
    </div>
  );
} 