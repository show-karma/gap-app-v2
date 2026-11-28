import type { Metadata } from "next";
import { SharedPanelPage } from "@/components/Pages/Panels/SharedPanelPage";

export const metadata: Metadata = {
  title: "Karma Panel",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function Page(props: Props) {
  const { token } = await props.params;
  return <SharedPanelPage token={token} />;
}
