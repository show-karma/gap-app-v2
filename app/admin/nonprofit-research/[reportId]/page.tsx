import type { Metadata } from "next";
import { AdminReportView } from "@/src/features/donor-research/components/admin/AdminReportView";
import { customMetadata } from "@/utilities/meta";

interface PageProps {
  params: Promise<{ reportId: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — Report (Admin)",
  description: "Staff view of a nonprofit-research report.",
  path: "/admin/nonprofit-research",
  robots: { index: false, follow: false },
});

export default async function Page({ params }: PageProps) {
  const { reportId } = await params;
  return <AdminReportView reportId={reportId} />;
}
