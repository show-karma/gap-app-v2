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
 * About page - displays project details like description, mission, problem, solution.
 */
export default function AboutPage() {
  return <AboutContentWrapper />;
}
