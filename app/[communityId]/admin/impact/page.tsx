"use client";
import ImpactPage from "@/components/Pages/Admin/Impact";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ImpactPage />
    </Suspense>
  );
}
