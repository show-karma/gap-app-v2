import type { Metadata } from "next";
import { Suspense } from "react";
import { Stats } from "@/components/Pages/Stats";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Platform Statistics",
  description:
    "View Karma platform statistics including total projects, grants, communities, and ecosystem growth metrics.",
  path: "/stats",
});

export default function Index() {
  return (
    <Suspense>
      <Stats />
    </Suspense>
  );
}
