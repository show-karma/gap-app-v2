import MyProjects from "@/components/Pages/MyProjects";
import { Spinner } from "@/components/Utilities/Spinner";
import { defaultMetadata } from "@/utilities/meta";
import { Suspense } from "react";

export const metadata = defaultMetadata;

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <MyProjects />
    </Suspense>
  );
}
