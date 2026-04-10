import type { Metadata } from "next";
import { Dashboard } from "@/components/Pages/Dashboard/Dashboard";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Dashboard",
  description:
    "Your Karma dashboard. Manage projects, review grants, track milestones, and monitor your ecosystem activity.",
  path: "/dashboard",
  robots: { index: false, follow: true },
});

export default function Page() {
  return <Dashboard />;
}
