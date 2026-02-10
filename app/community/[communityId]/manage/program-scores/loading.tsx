import { Spinner } from "@/components/Utilities/Spinner";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  );
}
