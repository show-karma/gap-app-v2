import React, { Suspense } from "react";
import { defaultMetadata } from "@/lib/metadata/meta";
import { Stats } from "@/features/stats/components";

export const metadata = defaultMetadata;

export default function Index() {
  return (
    <Suspense>
      <Stats />
    </Suspense>
  );
}
