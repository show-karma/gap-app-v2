import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsAgentActionsPage } from "@/components/Pages/SettingsAgentActions/SettingsAgentActionsPage";
import { customMetadata } from "@/utilities/meta";
import Loading from "./loading";

export const metadata: Metadata = customMetadata({
  title: "Agent actions — Karma settings",
  description: "Review, approve, or reject the actions your AI agents have proposed on Karma.",
  path: "/settings/agent-actions",
  robots: { index: false, follow: false },
});

// SettingsAgentActionsPage calls useSearchParams() to read the `?item=` deep
// link, which Next.js App Router requires to be wrapped in a Suspense boundary
// or the production build fails with "useSearchParams() should be wrapped in a
// Suspense boundary at page /settings/agent-actions".
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsAgentActionsPage />
    </Suspense>
  );
}
