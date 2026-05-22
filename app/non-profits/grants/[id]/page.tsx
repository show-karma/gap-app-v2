import type { Metadata } from "next";
import { GrantDetailDynamic } from "@/src/features/non-profits/components/grant-detail-dynamic";
import { customMetadata } from "@/utilities/meta";

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
      title: "Grant — Grow Nonprofits",
      description: "View grant details, funder information, and related grants.",
      path: `/non-profits/grants/${id}`,
    });
  }

  const amountStr = grant.amount != null ? formatCurrencySimple(grant.amount) : "";
  const parts: string[] = [];
  if (amountStr) parts.push(amountStr);
  if (grant.purposeText) parts.push(grant.purposeText);
  const title =
    parts.length > 0 ? `${parts.join(" — ")} — Grow Nonprofits` : "Grant — Grow Nonprofits";

  const recipientPart = grant.recipientName ? ` to ${grant.recipientName}` : "";
  const description = `${amountStr ? `${amountStr} grant` : "Grant"}${recipientPart}${grant.purposeText ? `: ${grant.purposeText}` : ""}`;

  return customMetadata({
    title,
    description,
    path: `/non-profits/grants/${id}`,
  });
}

export default async function GrantPage({ params }: { params: Promise<GrantPageParams> }) {
  const { id } = await params;

  return (
    <main className="w-full">
      <GrantDetailDynamic id={id} />
    </main>
  );
}
