import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { AdminAdvisorsList } from "@/src/features/donor-research/components/admin/AdminAdvisorsList";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — Advisors (Admin)",
  description: "Staff overview of donor advisors and the reports they generate.",
  path: "/admin/nonprofit-research",
  robots: { index: false, follow: false },
});

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <AdminAdvisorsList />
    </Suspense>
  );
}
