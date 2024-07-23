/* eslint-disable @next/next/no-img-element */
import { defaultMetadata } from "@/utilities/meta";
import { CommunitiesToAdmin } from "@/components/Pages/Admin";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";

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
      <CommunitiesToAdmin />
    </Suspense>
  );
}
