import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex w-full items-center min-h-screen h-full justify-center">
      <Spinner />
    </div>
  );
}
