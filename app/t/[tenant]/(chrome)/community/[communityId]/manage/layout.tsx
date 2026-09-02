import type { Metadata } from "next";
import { ManageLayoutClient } from "@/components/Manage/ManageLayoutClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * `communityId` is resolved here, on the server, and handed down as a prop.
 *
 * The client half used to read it with `useParams()`. That is fine while every
 * segment of the URL is a build-time sample -- the 25 non-nested manage routes
 * prerender that way -- but `useParams()` returns the *whole* matched route,
 * so on `funding-platform/[programId]/*` and `portfolio-reports/[reportId]/*`
 * it also carries a segment no sample supplies. Reading it in a client
 * component is then runtime data outside a boundary (CLIENT_HOOK_DYNAMIC) and
 * the route cannot prerender at all.
 *
 * Awaiting `params` here costs nothing new: the parent
 * `community/[communityId]/layout.tsx` already awaits the same param, so this
 * layout depends on exactly what its chain already depended on -- and only on
 * `communityId`, never on the unknown segment below it.
 */
export default async function ManageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;

  return <ManageLayoutClient communityId={communityId}>{children}</ManageLayoutClient>;
}
