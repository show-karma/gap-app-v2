"use client";

import dynamic from "next/dynamic";

const AboutContentWrapper = dynamic(
  () =>
    import("@/components/Pages/Project/v2/Content/AboutContentWrapper").then(
      (mod) => mod.AboutContentWrapper
    ),
  {
    loading: () => <div className="animate-pulse text-gray-500">Loading about...</div>,
  }
);

/**
 * About page - displays project details like description, mission, problem, solution.
 */
export default function AboutPage() {
  return <AboutContentWrapper />;
}
