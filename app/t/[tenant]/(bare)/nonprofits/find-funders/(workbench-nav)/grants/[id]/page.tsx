import type { Metadata } from "next";
import { Suspense } from "react";
import { GrantDetailDynamic } from "@/src/features/non-profits/components/grant-detail-dynamic";
import { customMetadata } from "@/utilities/meta";
import Loading from "./loading";

/**
 * Grant detail page (Phase 4).
 * Server Component shell — hydration handled by GrantDetailDynamic (ssr: false).
 */

interface GrantPageParams {
  id: string;
}

interface GrantSeoData {
  purposeText?: string | null;
  amount?: number | null;
  recipientName?: string | null;
}

async function fetchGrantForSeo(id: string): Promise<GrantSeoData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/v2/philanthropy/grants/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as GrantSeoData;
  } catch {
    return null;
  }
}

function formatCurrencySimple(amount: number | null | undefined): string {
  if (amount == null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<GrantPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const grant = await fetchGrantForSeo(id);

  if (!grant) {
    return customMetadata({
      title: "Grant — Karma Find Funders",
      description: "View grant details, funder information, and related grants.",
      path: `/nonprofits/find-funders/grants/${id}`,
    });
  }

  const amountStr = grant.amount != null ? formatCurrencySimple(grant.amount) : "";
  const parts: string[] = [];
  if (amountStr) parts.push(amountStr);
  if (grant.purposeText) parts.push(grant.purposeText);
  const title =
    parts.length > 0 ? `${parts.join(" — ")} — Karma Find Funders` : "Grant — Karma Find Funders";

  const recipientPart = grant.recipientName ? ` to ${grant.recipientName}` : "";
  const description = `${amountStr ? `${amountStr} grant` : "Grant"}${recipientPart}${grant.purposeText ? `: ${grant.purposeText}` : ""}`;

  return customMetadata({
    title,
    description,
    path: `/nonprofits/find-funders/grants/${id}`,
  });
}

/**
 * The `params` read lives in the async child below, not in the page body.
 *
 * Under `cacheComponents` a `params` access in the page itself is runtime data
 * outside a boundary, and the route fails to prerender outright (P2-6). One
 * level down it sits behind this Suspense boundary: the shell prerenders and
 * only the id-dependent part streams. The fallback is the route's own
 * `loading.tsx`, so the streamed state is byte-for-byte what this route already
 * showed while it was fully dynamic.
 *
 * This is allowed here in a way it would not be on a crawlable route: these
 * `[id]` detail routes are not in the sitemap. The section landing and its
 * `/connect` pages are (app/sitemaps/static/sitemap.ts), so DEV-612's ban on a
 * boundary above page content is live one level up -- it just does not reach
 * here.
 */
export default function GrantPage({ params }: { params: Promise<GrantPageParams> }) {
  return (
    <Suspense fallback={<Loading />}>
      <GrantDetailContent params={params} />
    </Suspense>
  );
}

async function GrantDetailContent({ params }: { params: Promise<GrantPageParams> }) {
  const { id } = await params;

  return (
    <main className="w-full">
      <GrantDetailDynamic id={id} />
    </main>
  );
}
