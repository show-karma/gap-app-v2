import type { Metadata } from "next";
import { NewReportView } from "@/src/features/donor-research/components/common/NewReportView";
import { customMetadata } from "@/utilities/meta";

interface PageProps {
  searchParams: Promise<{ handle?: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — New Report",
  description: "Start a new ranked nonprofit research report for a donor persona.",
  path: "/nonprofit-research/new",
  robots: { index: false, follow: false },
});

export default async function Page({ searchParams }: PageProps) {
  const { handle } = await searchParams;
  return <NewReportView initialDonorHandleId={handle} />;
}
