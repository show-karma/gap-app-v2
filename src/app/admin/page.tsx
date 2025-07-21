/* eslint-disable @next/next/no-img-element */
import { defaultMetadata } from "@/lib/metadata/meta";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { CommunitiesToAdmin } from "@/features/admin/components";

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
