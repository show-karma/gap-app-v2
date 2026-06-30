import type { Metadata } from "next";
import { DonorDetailView } from "@/src/features/donor-research/components/donor-detail/DonorDetailView";
import { customMetadata } from "@/utilities/meta";

interface PageProps {
  params: Promise<{ handleId: string }>;
}

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — Donor",
  description: "Manage a donor handle's private notes and research persona.",
  path: "/nonprofit-research",
  robots: { index: false, follow: false },
});

export default async function Page({ params }: PageProps) {
  const { handleId } = await params;
  return <DonorDetailView handleId={handleId} />;
}
