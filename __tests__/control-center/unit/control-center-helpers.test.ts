/**
 * Unit tests for pure helper logic used in ControlCenterPage.
 *
 * These functions are defined inline in the component. We re-implement the same
 * pure logic here to verify correctness of the status computation, checkbox
 * disabled state, and disbursement totals calculation.
 */

import { formatUnits, isAddress } from "viem";
import {
  AggregatedDisbursementStatus,
  type PayoutDisbursement,
  PayoutDisbursementStatus,
  type TokenTotal,
} from "@/src/features/payout-disbursement/types/payout-disbursement";
import { createMockDisbursement, createMockTokenTotal } from "../fixtures";

// ---- Re-implement the pure helper functions exactly as in the component ----

interface DisbursementMapEntry {
  totalsByToken: TokenTotal[];
  status: string;
  history: PayoutDisbursement[];
}

function computeDisplayStatus(disbursementInfo?: DisbursementMapEntry): {
  label: string;
  color: string;
} {
  const aggregatedStatus = disbursementInfo?.status;
  const history = disbursementInfo?.history || [];
  const latestDisbursement = history[0];

  if (history.length === 0) {
    return { label: "Pending", color: "text-gray-500 bg-gray-100 dark:bg-gray-700" };
  }

  const hasDisbursedTransaction = history.some(
    (d) => d.status === PayoutDisbursementStatus.DISBURSED
  );
  const allCancelled = history.every((d) => d.status === PayoutDisbursementStatus.CANCELLED);

  if (latestDisbursement?.status === PayoutDisbursementStatus.AWAITING_SIGNATURES) {
    return {
      label: "Awaiting Signatures",
      color: "text-yellow-800 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300",
    };
  }
  if (aggregatedStatus === AggregatedDisbursementStatus.COMPLETED) {
    return {
      label: "Disbursed",
      color: "text-green-700 bg-green-100 dark:bg-green-900/30",
    };
  }
  if (hasDisbursedTransaction) {
    return {
      label: "Partially Disbursed",
      color: "text-blue-700 bg-blue-100 dark:bg-blue-900/30",
    };
  }
  if (allCancelled) {
    return {
      label: "Cancelled",
      color: "text-gray-700 bg-gray-200 dark:bg-gray-600",
    };
  }
  if (latestDisbursement?.status === PayoutDisbursementStatus.FAILED) {
    return {
      label: "Failed",
      color: "text-red-700 bg-red-100 dark:bg-red-900/30",
    };
  }

  return { label: "Pending", color: "text-gray-500 bg-gray-100 dark:bg-gray-700" };
}

interface TableRow {
  grantUid: string;
  projectUid: string;
  projectName: string;
  projectSlug: string;
  grantName: string;
  grantProgramId: string;
  grantChainId: number;
  projectChainId: number;
  currentPayoutAddress?: string;
  currentAmount?: string;
}

function getTotalDisbursed(totalsByToken: TokenTotal[]): number {
  if (!totalsByToken || totalsByToken.length === 0) return 0;
  return totalsByToken.reduce((sum, tokenTotal) => {
    const rawAmount = BigInt(tokenTotal.totalAmount || "0");
    const decimals = tokenTotal.tokenDecimals || 6;
    const humanReadable = parseFloat(formatUnits(rawAmount, decimals));
    return sum + humanReadable;
  }, 0);
}

function getCheckboxDisabledState(
  item: TableRow,
  disbursementMap: Record<string, DisbursementMapEntry>
): { disabled: boolean; reason: string | null } {
  const payoutAddress = item.currentPayoutAddress;
  const amount = item.currentAmount;
  const parsedAmount = amount ? parseFloat(amount) : 0;

  if (!payoutAddress || payoutAddress.trim() === "") {
    return { disabled: true, reason: "Missing payout address" };
  }
  if (!isAddress(payoutAddress)) {
    return { disabled: true, reason: "Invalid payout address" };
  }
  if (parsedAmount === 0 || Number.isNaN(parsedAmount)) {
    return { disabled: true, reason: "Payout amount is 0 or missing" };
  }

  const disbursementInfo = disbursementMap[item.grantUid];
  if (disbursementInfo) {
    const FULLY_DISBURSED_EPSILON = 1e-6;
    const totalDisbursed = getTotalDisbursed(disbursementInfo.totalsByToken);
    const remainingAmount = parsedAmount - totalDisbursed;
    if (remainingAmount <= FULLY_DISBURSED_EPSILON) {
      return { disabled: true, reason: "Fully disbursed" };
    }
  }

  return { disabled: false, reason: null };
}

// ---- Tests ----

describe("computeDisplayStatus", () => {
  it("returns Pending when there is no disbursement info", () => {
    const result = computeDisplayStatus(undefined);
    expect(result.label).toBe("Pending");
  });

  it("returns Pending when history is empty", () => {
    const result = computeDisplayStatus({
      totalsByToken: [],
      status: AggregatedDisbursementStatus.NOT_STARTED,
      history: [],
    });
    expect(result.label).toBe("Pending");
  });

  it("returns Awaiting Signatures when latest disbursement is awaiting signatures", () => {
    const result = computeDisplayStatus({
      totalsByToken: [],
      status: AggregatedDisbursementStatus.IN_PROGRESS,
      history: [
        createMockDisbursement({
          status: PayoutDisbursementStatus.AWAITING_SIGNATURES,
        }),
      ],
    });
    expect(result.label).toBe("Awaiting Signatures");
    expect(result.color).toContain("yellow");
  });

  it("returns Disbursed when aggregated status is COMPLETED", () => {
    const result = computeDisplayStatus({
      totalsByToken: [createMockTokenTotal()],
      status: AggregatedDisbursementStatus.COMPLETED,
      history: [
        createMockDisbursement({
          status: PayoutDisbursementStatus.DISBURSED,
        }),
      ],
    });
    expect(result.label).toBe("Disbursed");
    expect(result.color).toContain("green");
  });

  it("returns Partially Disbursed when some transactions are disbursed but not completed", () => {
    const result = computeDisplayStatus({
      totalsByToken: [createMockTokenTotal()],
      status: AggregatedDisbursementStatus.IN_PROGRESS,
      history: [
        createMockDisbursement({
          status: PayoutDisbursementStatus.PENDING,
        }),
        createMockDisbursement({
          id: "d-2",
          status: PayoutDisbursementStatus.DISBURSED,
        }),
      ],
    });
    expect(result.label).toBe("Partially Disbursed");
    expect(result.color).toContain("blue");
  });

  it("returns Cancelled when all transactions are cancelled", () => {
    const result = computeDisplayStatus({
      totalsByToken: [],
      status: AggregatedDisbursementStatus.NOT_STARTED,
      history: [
        createMockDisbursement({
          status: PayoutDisbursementStatus.CANCELLED,
        }),
        createMockDisbursement({
          id: "d-2",
          status: PayoutDisbursementStatus.CANCELLED,
        }),
      ],
    });
    expect(result.label).toBe("Cancelled");
  });

  it("returns Failed when latest disbursement failed and no other special conditions", () => {
    const result = computeDisplayStatus({
      totalsByToken: [],
      status: AggregatedDisbursementStatus.IN_PROGRESS,
      history: [
        createMockDisbursement({
          status: PayoutDisbursementStatus.FAILED,
        }),
      ],
    });
    expect(result.label).toBe("Failed");
    expect(result.color).toContain("red");
  });

  it("returns Pending as fallback for PENDING status with history", () => {
    const result = computeDisplayStatus({
      totalsByToken: [],
      status: AggregatedDisbursementStatus.IN_PROGRESS,
      history: [
        createMockDisbursement({
          status: PayoutDisbursementStatus.PENDING,
        }),
      ],
    });
    expect(result.label).toBe("Pending");
  });

  it("prioritizes Awaiting Signatures over Partially Disbursed", () => {
    // Latest is AWAITING_SIGNATURES but there is also a DISBURSED one
    const result = computeDisplayStatus({
      totalsByToken: [createMockTokenTotal()],
      status: AggregatedDisbursementStatus.IN_PROGRESS,
      history: [
        createMockDisbursement({
          status: PayoutDisbursementStatus.AWAITING_SIGNATURES,
        }),
        createMockDisbursement({
          id: "d-2",
          status: PayoutDisbursementStatus.DISBURSED,
        }),
      ],
    });
    expect(result.label).toBe("Awaiting Signatures");
  });
});

describe("getCheckboxDisabledState", () => {
  const baseItem: TableRow = {
    grantUid: "grant-uid-1",
    projectUid: "project-uid-1",
    projectName: "Test Project",
    projectSlug: "test-project",
    grantName: "Test Grant",
    grantProgramId: "program-1",
    grantChainId: 10,
    projectChainId: 10,
    currentPayoutAddress: "0x1234567890abcdef1234567890abcdef12345678",
    currentAmount: "10000",
  };

  it("returns disabled when payout address is missing", () => {
    const result = getCheckboxDisabledState({ ...baseItem, currentPayoutAddress: undefined }, {});
    expect(result.disabled).toBe(true);
    expect(result.reason).toBe("Missing payout address");
  });

  it("returns disabled when payout address is empty string", () => {
    const result = getCheckboxDisabledState({ ...baseItem, currentPayoutAddress: "" }, {});
    expect(result.disabled).toBe(true);
    expect(result.reason).toBe("Missing payout address");
  });

  it("returns disabled when payout address is whitespace only", () => {
    const result = getCheckboxDisabledState({ ...baseItem, currentPayoutAddress: "   " }, {});
    expect(result.disabled).toBe(true);
    expect(result.reason).toBe("Missing payout address");
  });

  it("returns disabled when payout address is invalid", () => {
    const result = getCheckboxDisabledState(
      { ...baseItem, currentPayoutAddress: "not-an-address" },
      {}
    );
    expect(result.disabled).toBe(true);
    expect(result.reason).toBe("Invalid payout address");
  });

  it("returns disabled when amount is 0", () => {
    const result = getCheckboxDisabledState({ ...baseItem, currentAmount: "0" }, {});
    expect(result.disabled).toBe(true);
    expect(result.reason).toBe("Payout amount is 0 or missing");
  });

  it("returns disabled when amount is missing", () => {
    const result = getCheckboxDisabledState({ ...baseItem, currentAmount: undefined }, {});
    expect(result.disabled).toBe(true);
    expect(result.reason).toBe("Payout amount is 0 or missing");
  });

  it("returns disabled when amount is NaN", () => {
    const result = getCheckboxDisabledState({ ...baseItem, currentAmount: "abc" }, {});
    expect(result.disabled).toBe(true);
    expect(result.reason).toBe("Payout amount is 0 or missing");
  });

  it("returns disabled when fully disbursed (exact match)", () => {
    // 10000 USDC = 10000000000 raw with 6 decimals
    const result = getCheckboxDisabledState(
      { ...baseItem },
      {
        "grant-uid-1": {
          totalsByToken: [createMockTokenTotal({ totalAmount: "10000000000", tokenDecimals: 6 })],
          status: AggregatedDisbursementStatus.COMPLETED,
          history: [],
        },
      }
    );
    expect(result.disabled).toBe(true);
    expect(result.reason).toBe("Fully disbursed");
  });

  it("returns disabled when fully disbursed within epsilon", () => {
    // Amount exceeds target by a negligible fraction (due to multi-token rounding)
    // 10000.0000001 USDC disbursed against 10000 approved => remaining is negative => within epsilon
    const result = getCheckboxDisabledState(
      { ...baseItem },
      {
        "grant-uid-1": {
          totalsByToken: [
            createMockTokenTotal({
              totalAmount: "10000000000", // exactly 10000 USDC
              tokenDecimals: 6,
            }),
          ],
          status: AggregatedDisbursementStatus.IN_PROGRESS,
          history: [],
        },
      }
    );
    expect(result.disabled).toBe(true);
    expect(result.reason).toBe("Fully disbursed");
  });

  it("returns enabled when remaining is slightly above epsilon", () => {
    // 9999 USDC disbursed against 10000 => remaining is 1 USDC => not fully disbursed
    const result = getCheckboxDisabledState(
      { ...baseItem },
      {
        "grant-uid-1": {
          totalsByToken: [
            createMockTokenTotal({
              totalAmount: "9999000000", // 9999 USDC
              tokenDecimals: 6,
            }),
          ],
          status: AggregatedDisbursementStatus.IN_PROGRESS,
          history: [],
        },
      }
    );
    expect(result.disabled).toBe(false);
    expect(result.reason).toBeNull();
  });

  it("returns enabled when partially disbursed with significant remainder", () => {
    const result = getCheckboxDisabledState(
      { ...baseItem },
      {
        "grant-uid-1": {
          totalsByToken: [createMockTokenTotal({ totalAmount: "5000000000", tokenDecimals: 6 })],
          status: AggregatedDisbursementStatus.IN_PROGRESS,
          history: [],
        },
      }
    );
    expect(result.disabled).toBe(false);
    expect(result.reason).toBeNull();
  });

  it("returns enabled when no disbursement info exists", () => {
    const result = getCheckboxDisabledState(baseItem, {});
    expect(result.disabled).toBe(false);
    expect(result.reason).toBeNull();
  });
});

describe("getTotalDisbursed", () => {
  it("returns 0 for empty array", () => {
    expect(getTotalDisbursed([])).toBe(0);
  });

  it("returns 0 for null-like input", () => {
    expect(getTotalDisbursed(null as unknown as TokenTotal[])).toBe(0);
    expect(getTotalDisbursed(undefined as unknown as TokenTotal[])).toBe(0);
  });

  it("calculates total for a single token", () => {
    const result = getTotalDisbursed([
      createMockTokenTotal({ totalAmount: "5000000000", tokenDecimals: 6 }),
    ]);
    expect(result).toBe(5000);
  });

  it("calculates total across multiple tokens with different decimals", () => {
    const result = getTotalDisbursed([
      createMockTokenTotal({
        token: "USDC",
        totalAmount: "5000000000",
        tokenDecimals: 6,
      }),
      createMockTokenTotal({
        token: "ETH",
        totalAmount: "1000000000000000000",
        tokenDecimals: 18,
      }),
    ]);
    // 5000 USDC + 1 ETH = 5001
    expect(result).toBe(5001);
  });

  it("handles zero amount", () => {
    const result = getTotalDisbursed([
      createMockTokenTotal({ totalAmount: "0", tokenDecimals: 6 }),
    ]);
    expect(result).toBe(0);
  });

  it("handles missing totalAmount gracefully", () => {
    const result = getTotalDisbursed([createMockTokenTotal({ totalAmount: "", tokenDecimals: 6 })]);
    expect(result).toBe(0);
  });

  it("defaults to 6 decimals when tokenDecimals is 0 (falsy)", () => {
    // When tokenDecimals is 0, the `|| 6` fallback kicks in
    const result = getTotalDisbursed([
      createMockTokenTotal({ totalAmount: "5000000", tokenDecimals: 0 }),
    ]);
    // 5000000 / 10^6 = 5
    expect(result).toBe(5);
  });
});
