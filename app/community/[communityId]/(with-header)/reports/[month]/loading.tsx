import { Spinner } from "@/components/Utilities/Spinner";

export default function Loading() {
  return (
    <output
      aria-label="Loading"
      className="flex w-full items-center min-h-screen h-full justify-center"
    >
      <Spinner />
    </output>
  );
}
