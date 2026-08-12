import type { Metadata } from "next";
import { NextStudioLayout } from "next-sanity/studio";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

// The Studio is an internal authoring tool, never a public/indexable page —
// noindex regardless of how deep the [[...tool]] catch-all route is.
export const metadata: Metadata = customMetadata({
  title: "Sanity Studio",
  description: "Content management studio for the Karma blog.",
  path: PAGES.ADMIN_STUDIO,
  robots: { index: false, follow: false },
});

// Studio-tuned viewport (touch-friendly resize behavior on mobile), same as
// next-sanity's own scaffold recommends.
export { viewport } from "next-sanity/studio";

// Full-screen container — `NextStudioLayout` renders the fixed-height,
// overscroll-locked `<div id="sanity">` the Studio UI expects. Site chrome
// (navbar/footer) is suppressed globally for this route in
// `src/components/navbar/global-navbar-slot.tsx` and
// `src/components/footer/footer-switcher.tsx`.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <NextStudioLayout>{children}</NextStudioLayout>;
}
