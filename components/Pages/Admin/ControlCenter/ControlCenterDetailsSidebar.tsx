import type { TableRow } from "./ControlCenterTable";
import { ProjectDetailsSidebar } from "./ProjectDetailsSidebar";
import type { useControlCenterData } from "./useControlCenterData";

type ControlCenterData = ReturnType<typeof useControlCenterData>;

interface ControlCenterDetailsSidebarProps {
  grant: TableRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityUID: string;
  dataVersion: number;
  invoiceRequiredMap: ControlCenterData["invoiceRequiredMap"];
  kycStatuses: ControlCenterData["kycStatuses"];
  disbursementMap: ControlCenterData["disbursementMap"];
  agreementMap: ControlCenterData["agreementMap"];
  invoiceMap: ControlCenterData["invoiceMap"];
  payoutConfigMap: ControlCenterData["payoutConfigMap"];
  onConfigSuccess: () => void;
  onCreateDisbursement: (grant: TableRow) => void;
}

/** Resolves the per-grant lookups into `ProjectDetailsSidebar` props. */
export function ControlCenterDetailsSidebar({
  grant,
  open,
  onOpenChange,
  communityUID,
  dataVersion,
  invoiceRequiredMap,
  kycStatuses,
  disbursementMap,
  agreementMap,
  invoiceMap,
  payoutConfigMap,
  onConfigSuccess,
  onCreateDisbursement,
}: ControlCenterDetailsSidebarProps) {
  return (
    <ProjectDetailsSidebar
      grant={grant}
      open={open}
      dataVersion={dataVersion}
      onOpenChange={onOpenChange}
      communityUID={communityUID}
      invoiceRequired={grant ? (invoiceRequiredMap[grant.grantUid] ?? false) : false}
      kycStatus={grant ? (kycStatuses.get(grant.projectUid) ?? null) : null}
      disbursementInfo={grant ? (disbursementMap[grant.grantUid] ?? null) : null}
      agreement={grant ? (agreementMap[grant.grantUid] ?? null) : null}
      milestoneInvoices={grant ? (invoiceMap[grant.grantUid] ?? []) : []}
      milestoneAllocations={
        grant ? (payoutConfigMap[grant.grantUid]?.milestoneAllocations ?? null) : null
      }
      onConfigSuccess={onConfigSuccess}
      onCreateDisbursement={() => {
        if (grant) onCreateDisbursement(grant);
      }}
    />
  );
}
