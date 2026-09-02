import type { Metadata } from "next";
import { PersonaDetailView } from "@/src/features/donor-research/components/personas/PersonaDetailView";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

interface PageProps {
  params: Promise<{ handleId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handleId } = await params;
  return customMetadata({
    title: "Nonprofit Research — Donor",
    description: "Research profile, private notes, and reports for a donor.",
    path: PAGES.DONOR_RESEARCH.PERSONA(handleId),
    robots: { index: false, follow: false },
  });
}

export default async function Page({ params }: PageProps) {
  const { handleId } = await params;
  return <PersonaDetailView handleId={handleId} />;
}
