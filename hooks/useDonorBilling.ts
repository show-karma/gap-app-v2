"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDonorPlanCatalog,
  fetchMyEntitlement,
  isBillingPortalUnavailable,
  isIntroPackRequiresSubscription,
  isSubscriptionAlreadyActive,
  startBillingCheckout,
  startBillingPortal,
  startPackCheckout,
} from "@/services/donor-research-billing.service";
import type {
  DonorBillingSession,
  DonorEntitlement,
  DonorPlanCatalog,
  DonorResearchPack,
  PurchasableDonorPlan,
} from "@/types/donor-research-billing";
import { PAGES } from "@/utilities/pages";

export const donorPlanCatalogQueryKey = ["donor-research", "billing", "plans"] as const;
export const donorEntitlementQueryKey = ["donor-research", "billing", "subscription"] as const;

/**
 * Public plan catalog. Cached hard — prices change on the order of quarters,
 * and this renders on a marketing page that should not re-request per view.
 */
export function useDonorPlanCatalog() {
  return useQuery<DonorPlanCatalog>({
    queryKey: donorPlanCatalogQueryKey,
    queryFn: fetchDonorPlanCatalog,
    staleTime: 60 * 60_000,
    gcTime: 60 * 60_000,
  });
}

interface UseDonorEntitlementOptions {
  /** Skip the request when Privy hasn't resolved an advisor session yet. */
  enabled?: boolean;
}

/**
 * The advisor's remaining report allowance. Short `staleTime` because it
 * changes every time a report runs, and the Stripe webhook can change it out
 * of band while the tab is open.
 */
export function useDonorEntitlement(opts: UseDonorEntitlementOptions = {}) {
  return useQuery<DonorEntitlement>({
    queryKey: donorEntitlementQueryKey,
    queryFn: fetchMyEntitlement,
    enabled: opts.enabled !== false,
    staleTime: 30_000,
  });
}

/** Absolute return URLs for Stripe. Empty string on the server; the mutations only run client-side. */
function billingReturnUrl(query: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${PAGES.DONOR_RESEARCH.BILLING}${query}`;
}

/**
 * Starts Stripe Checkout and hands the browser over.
 *
 * Entitlement is granted by the `customer.subscription.created` webhook, not
 * by the return trip — closing the tab mid-redirect still lands the plan.
 * The cache is invalidated on the way out so the billing page re-reads on
 * return rather than rendering the pre-purchase allowance.
 */
export function useStartCheckout() {
  const queryClient = useQueryClient();

  return useMutation<DonorBillingSession, Error, { plan: PurchasableDonorPlan }>({
    mutationFn: ({ plan }) =>
      startBillingCheckout({
        plan,
        successUrl: billingReturnUrl("?checkout=success"),
        cancelUrl: billingReturnUrl("?checkout=cancel"),
      }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: donorEntitlementQueryKey });
      if (typeof window !== "undefined" && session.url) {
        window.location.href = session.url;
      }
    },
    onError: (error) => {
      // 409: the advisor is already subscribed, so the cached entitlement that
      // made us offer a checkout is stale. Re-read it — the billing page then
      // renders "Change plan" + the portal CTA instead of a plan picker. The
      // message itself is rendered by the dialog; nothing is left unhandled.
      if (isSubscriptionAlreadyActive(error)) {
        queryClient.invalidateQueries({ queryKey: donorEntitlementQueryKey });
      }
    },
  });
}

/**
 * Starts a one-time PAYG / top-up pack Checkout and hands the browser over.
 * The prepaid balance is credited by the `payment_intent.succeeded` webhook.
 */
export function useStartPackCheckout() {
  const queryClient = useQueryClient();

  return useMutation<DonorBillingSession, Error, { pack: DonorResearchPack }>({
    mutationFn: ({ pack }) =>
      startPackCheckout({
        pack,
        successUrl: billingReturnUrl("?checkout=success"),
        cancelUrl: billingReturnUrl("?checkout=cancel"),
      }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: donorEntitlementQueryKey });
      if (typeof window !== "undefined" && session.url) {
        window.location.href = session.url;
      }
    },
    onError: (error) => {
      // 403: intro top-ups are subscriber-only. The dialog hides the offer for
      // a free/PAYG advisor, so reaching here means the entitlement we gated on
      // was stale — re-read it so the offer disappears.
      if (isIntroPackRequiresSubscription(error)) {
        queryClient.invalidateQueries({ queryKey: donorEntitlementQueryKey });
      }
    },
  });
}

/** Opens the Stripe Billing Portal for plan changes, card updates, cancellation. */
export function useOpenBillingPortal() {
  const queryClient = useQueryClient();

  return useMutation<DonorBillingSession, Error, void>({
    mutationFn: () => startBillingPortal(billingReturnUrl("?portal=return")),
    onSuccess: (session) => {
      // A plan change or cancellation made inside the portal arrives by
      // webhook; drop the cached entitlement so the return trip re-reads it.
      queryClient.invalidateQueries({ queryKey: donorEntitlementQueryKey });
      if (typeof window !== "undefined" && session.url) {
        window.location.href = session.url;
      }
    },
    onError: (error) => {
      // 404/409: no Stripe customer yet. The CTA is gated on
      // `hasBillingAccount`, so getting here means the cached entitlement is
      // ahead of the webhook — re-read it and let the message stand.
      if (isBillingPortalUnavailable(error)) {
        queryClient.invalidateQueries({ queryKey: donorEntitlementQueryKey });
      }
    },
  });
}
