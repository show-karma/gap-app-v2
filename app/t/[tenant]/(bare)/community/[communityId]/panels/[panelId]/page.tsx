import type { Metadata } from "next";
import { PanelStudio } from "@/components/Pages/Panels/PanelStudio";

export const metadata: Metadata = {
  title: "Karma Panels",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ communityId: string; panelId: string }>;
}

export default async function Page(props: Props) {
  const { communityId, panelId } = await props.params;
  return <PanelStudio communityId={communityId} panelId={panelId} />;
}
