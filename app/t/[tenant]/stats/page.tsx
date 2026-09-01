import type { Metadata } from "next";
import { Suspense } from "react";
import { Stats } from "@/components/Pages/Stats";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Platform Statistics - Projects, Grants & Ecosystem Growth",
  description:
    "View Karma platform statistics including total projects, grants awarded, active communities, milestone completions, and ecosystem growth metrics over time.",
  path: "/stats",
  robots: { index: false, follow: false },
});

export default function Index() {
  return (
    <Suspense>
      <Stats />
    </Suspense>
  );
}
