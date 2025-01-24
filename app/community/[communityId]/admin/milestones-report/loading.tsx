import { Spinner } from "@/components/Utilities/Spinner";

export default function LoadingPage() {
  return (
    <div className="flex w-full items-center justify-center">
      <Spinner />
    </div>
  );
}
