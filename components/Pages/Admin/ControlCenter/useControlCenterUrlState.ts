import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import type { CommunityPayoutsSorting } from "@/src/features/payout-disbursement/types/payout-disbursement";

type QueryUpdates = Record<string, string | null>;

function applyUpdates(current: URLSearchParams, updates: QueryUpdates): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  return next.toString();
}

/**
 * URL-driven filter/pagination state for the Control Center.
 *
 * `navigate` pushes a history entry (user-initiated filter changes).
 * `replaceQuery` rewrites the current entry with `history.replaceState`, which
 * Next syncs into `useSearchParams` without dispatching an App Router
 * navigation — safe to call from effects.
 */
export function useControlCenterUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedProgramId = searchParams.get("programId");
  const itemsPerPage = Number(searchParams.get("limit")) || 25;
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search") || "";
  const sortBy = (searchParams.get("sortBy") as CommunityPayoutsSorting["sortBy"]) || undefined;
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || undefined;
  const agreementFilter = searchParams.get("agreementStatus") as
    | "signed"
    | "not_signed"
    | undefined;
  const invoiceFilter = searchParams.get("invoiceStatus") as
    | "all_received"
    | "needs_invoices"
    | "has_invoices"
    | undefined;
  const disbursementFilter = searchParams.get("status") as
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | undefined;
  const kycFilter = searchParams.get("kycStatus") || undefined;
  const projectParam = searchParams.get("project") || undefined;
  const grantParam = searchParams.get("grant") || undefined;

  const filterSignature = JSON.stringify({
    selectedProgramId,
    agreementFilter,
    invoiceFilter,
    disbursementFilter,
    kycFilter,
    searchQuery,
  });
  const hasActiveFilters = !!(
    agreementFilter ||
    invoiceFilter ||
    disbursementFilter ||
    kycFilter ||
    searchQuery ||
    selectedProgramId
  );

  const navigate = useCallback(
    (updates: QueryUpdates) => {
      router.push(`${pathname}?${applyUpdates(searchParams, updates)}`);
    },
    [router, pathname, searchParams]
  );

  const replaceQuery = useCallback(
    (updates: QueryUpdates) => {
      const query = applyUpdates(searchParams, updates);
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams]
  );

  const clearAll = useCallback(() => router.push(pathname), [router, pathname]);

  // Safety net: whenever any filter changes, force page back to 1.
  const previousFilterSignature = useRef(filterSignature);
  useEffect(() => {
    if (previousFilterSignature.current === filterSignature) return;
    previousFilterSignature.current = filterSignature;
    if (currentPage !== 1) replaceQuery({ page: "1" });
  }, [currentPage, filterSignature, replaceQuery]);

  return {
    selectedProgramId,
    itemsPerPage,
    currentPage,
    searchQuery,
    sortBy,
    sortOrder,
    agreementFilter,
    invoiceFilter,
    disbursementFilter,
    kycFilter,
    projectParam,
    grantParam,
    hasActiveFilters,
    navigate,
    replaceQuery,
    clearAll,
  };
}
