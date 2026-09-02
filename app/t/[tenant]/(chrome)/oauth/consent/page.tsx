import type { Metadata } from "next";
import { Suspense } from "react";
import { OAuthConsentClient } from "@/components/Pages/OAuthConsent/OAuthConsentClient";
import { customMetadata } from "@/utilities/meta";
import Loading from "./loading";

export const metadata: Metadata = customMetadata({
  title: "Authorize app access — Karma",
  description: "Review and approve an external app's request to access your Karma MCP tools.",
  path: "/oauth/consent",
  robots: { index: false, follow: false },
});

// Block class. An authorization decision, never a destination reached by
// prefetch: the consent screen must reflect the live request, so this segment
// is opted out of instant navigation. Only legal with `cacheComponents` on.
export const instant = false;

// OAuthConsentClient calls useSearchParams(), which Next.js App Router
// requires to be wrapped in a Suspense boundary or the production build
// fails with "useSearchParams() should be wrapped in a Suspense
// boundary at page /oauth/consent".
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <OAuthConsentClient />
    </Suspense>
  );
}
