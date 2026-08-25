import { getPaidAllocationIds } from "@/src/features/payout-disbursement/components/MilestoneSelectionStep";
import type { GrantDisbursementInfo } from "@/src/features/payout-disbursement/types/payout-disbursement";
import type { TableRow } from "./ControlCenterTable";
import type { useControlCenterData } from "./useControlCenterData";

type ControlCenterData = ReturnType<typeof useControlCenterData>;

export interface GrantDisbursementLookups {
  payoutConfigMap: ControlCenterData["payoutConfigMap"];
  disbursementMap: ControlCenterData["disbursementMap"];
}

export function toGrantDisbursementInfo(
  item: TableRow,
  { payoutConfigMap, disbursementMap }: GrantDisbursementLookups
): GrantDisbursementInfo {
  const disbursement = disbursementMap[item.grantUid];
  return {
    grantUID: item.grantUid,
    projectUID: item.projectUid,
    grantName: item.grantName,
    projectName: item.projectName,
    payoutAddress: item.currentPayoutAddress || "",
    approvedAmount: item.currentAmount || "0",
    totalsByToken: disbursement?.totalsByToken || [],
    milestoneAllocations: payoutConfigMap[item.grantUid]?.milestoneAllocations || [],
    paidAllocationIds: getPaidAllocationIds(disbursement?.history || []),
  };
}
