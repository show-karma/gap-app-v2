import type { Metadata } from "next";
import { PersonasListView } from "@/src/features/donor-research/components/personas/PersonasListView";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — Donors",
  description: "Manage the anonymous donors you research on behalf of.",
  path: PAGES.DONOR_RESEARCH.PERSONAS,
  robots: { index: false, follow: false },
});

export default function Page() {
  return <PersonasListView />;
}
