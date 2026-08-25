import { useCallback, useState } from "react";
import type { GrantDisbursementInfo } from "@/src/features/payout-disbursement/types/payout-disbursement";
import type { TableRow } from "./ControlCenterTable";
import { type GrantDisbursementLookups, toGrantDisbursementInfo } from "./grantDisbursementInfo";

export function useDisbursementModal(lookups: GrantDisbursementLookups) {
  const [isOpen, setIsOpen] = useState(false);
  const [grants, setGrants] = useState<GrantDisbursementInfo[]>([]);

  const openFor = useCallback(
    (items: TableRow[]) => {
      setGrants(items.map((item) => toGrantDisbursementInfo(item, lookups)));
      setIsOpen(true);
    },
    [lookups]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setGrants([]);
  }, []);

  return { isOpen, grants, openFor, close };
}
