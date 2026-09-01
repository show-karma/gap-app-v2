import { describe, expect, it } from "vitest";
import type { TableRow } from "@/components/Pages/Admin/ControlCenter/ControlCenterTable";
import { toGrantDisbursementInfo } from "@/components/Pages/Admin/ControlCenter/grantDisbursementInfo";

const row = {
  grantUid: "grant-1",
  projectUid: "project-1",
  grantName: "Batch 2",
  projectName: "Cabinet Miner Deployment",
  currentPayoutAddress: "0xabc",
  currentAmount: "1000",
} as TableRow;

describe("toGrantDisbursementInfo", () => {
  it("should_map_row_and_lookups_into_disbursement_info", () => {
    const result = toGrantDisbursementInfo(row, {
      payoutConfigMap: { "grant-1": { milestoneAllocations: [{ id: "m1" }] } },
      disbursementMap: {
        "grant-1": { totalsByToken: [{ token: "USDC" }], history: [], status: "IN_PROGRESS" },
      },
    } as never);

    expect(result).toMatchObject({
      grantUID: "grant-1",
      projectUID: "project-1",
      grantName: "Batch 2",
      projectName: "Cabinet Miner Deployment",
      payoutAddress: "0xabc",
      approvedAmount: "1000",
      totalsByToken: [{ token: "USDC" }],
      milestoneAllocations: [{ id: "m1" }],
      paidAllocationIds: [],
    });
  });

  it("should_fall_back_to_empty_values_when_lookups_are_missing", () => {
    const result = toGrantDisbursementInfo(
      { ...row, currentPayoutAddress: null, currentAmount: null } as TableRow,
      { payoutConfigMap: {}, disbursementMap: {} } as never
    );

    expect(result.payoutAddress).toBe("");
    expect(result.approvedAmount).toBe("0");
    expect(result.totalsByToken).toEqual([]);
    expect(result.milestoneAllocations).toEqual([]);
    expect(result.paidAllocationIds).toEqual([]);
  });
});
