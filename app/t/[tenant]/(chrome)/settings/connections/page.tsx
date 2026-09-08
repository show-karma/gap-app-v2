import type { Metadata } from "next";
import { SettingsConnectionsPage } from "@/components/Pages/SettingsConnections/SettingsConnectionsPage";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Connections — Karma settings",
  description: "Review and revoke the AI apps connected to your Karma account.",
  path: "/settings/connections",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <SettingsConnectionsPage />;
}
