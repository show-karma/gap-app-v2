"use client";

import dynamic from "next/dynamic";
import { AboutContentSkeleton } from "@/components/Pages/Project/v2/Skeletons";

const AboutContentWrapper = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Content/AboutContentWrapper").then(
      (mod) => mod.AboutContentWrapper
    ),
  {
    loading: () => <AboutContentSkeleton />,
  }
);

/**
 * Client-side about content wrapper.
 */
export function AboutPageClient() {
  return <AboutContentWrapper />;
}
