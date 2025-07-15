/* eslint-disable @next/next/no-img-element */
import { defaultMetadata } from "@/utilities/meta";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import SumupAdminPage from "@/features/admin/components/SumupAdmin";

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
      <SumupAdminPage />
    </Suspense>
  );
}
