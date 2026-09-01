import type { Metadata } from "next";
import { EmptyDashboardPreview } from "@/components/Pages/Dashboard/EmptyDashboardPreview";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Empty dashboard preview",
  description: "Preview of the dashboard's empty (no-data) state.",
  path: "/empty-dashboard",
  robots: { index: false, follow: false },
});

export default function Page() {
  return (
    <main className="flex w-full flex-col">
      <EmptyDashboardPreview />
    </main>
  );
}
