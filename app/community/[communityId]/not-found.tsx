"use client";

import { useParams } from "next/navigation";
import { CommunityNotFound } from "@/components/Pages/Communities/CommunityNotFound";

// Note: metadata exports are ignored in client components by Next.js App Router.
// The robots noindex is aspirational defense-in-depth; actual noindex is handled
// by the layout's generateMetadata when community is not found.
export default function CommunityNotFoundPage() {
  const params = useParams<{ communityId: string }>();
  return <CommunityNotFound communityId={params.communityId ?? ""} />;
}
