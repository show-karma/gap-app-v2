import { Suspense } from "react";
import { Stats } from "@/components/Pages/Stats";
import { defaultMetadata } from "@/utilities/meta";

export const metadata = defaultMetadata;

export default function Index() {
  return (
    <Suspense>
      <Stats />
    </Suspense>
  );
}
