import { permanentRedirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";

interface PageProps {
  params: Promise<{ reportId: string }>;
}

/**
 * Legacy staff report URL. The staff report view now lives on the regular
 * advisor route — the API grants the staff allowlist an unscoped read on the
 * same endpoint — so this route only preserves old bookmarks/links.
 */
export default async function Page({ params }: PageProps) {
  const { reportId } = await params;
  permanentRedirect(PAGES.DONOR_RESEARCH.REPORT(reportId));
}
