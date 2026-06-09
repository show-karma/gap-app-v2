import type { Metadata } from "next";
import { ReportBriefView } from "@/src/features/donor-research/components/report-brief/ReportBriefView";
import { customMetadata } from "@/utilities/meta";

interface PageProps {
  params: Promise<{ reportId: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Donor Research — Report",
  description: "View a donor-research report.",
  path: "/donor-research",
  robots: { index: false, follow: false },
});

export default async function Page({ params }: PageProps) {
  const { reportId } = await params;
  return <ReportBriefView reportId={reportId} />;
}
