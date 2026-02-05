import type { Grant } from "@/types/v2/grant";
import { getGrantAmountDisplay, getGrantDisplayAmount } from "@/utilities/getGrantDisplayAmount";

describe("getGrantDisplayAmount", () => {
  describe("when grant is null or undefined", () => {
    it("should return empty result for null grant", () => {
      const result = getGrantDisplayAmount(null);

      expect(result.hasAmount).toBe(false);
      expect(result.displayAmount).toBeUndefined();
      expect(result.rawAmount).toBeUndefined();
      expect(result.currency).toBe("");
      expect(result.isFromFinancialConfig).toBe(false);
    });

    it("should return empty result for undefined grant", () => {
      const result = getGrantDisplayAmount(undefined);

      expect(result.hasAmount).toBe(false);
      expect(result.displayAmount).toBeUndefined();
    });
  });

  describe("when approvedAmount is present (financial config)", () => {
    it("should prioritize approvedAmount over details.amount", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        approvedAmount: "80000",
        details: {
          title: "Test Grant",
          amount: "190000", // This should be ignored
        },
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(true);
      expect(result.isFromFinancialConfig).toBe(true);
      expect(result.rawAmount).toBe("80000");
      expect(result.displayAmount).toBe("80K");
    });

    it("should extract currency from approvedAmount string", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        approvedAmount: "50000 USDC",
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(true);
      expect(result.currency).toBe("USDC");
      expect(result.displayAmount).toBe("50K");
    });

    it("should use details.currency if not in approvedAmount", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        approvedAmount: "25000",
        details: {
          title: "Test Grant",
          currency: "ARB",
        },
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.currency).toBe("ARB");
    });

    it("should handle already formatted amounts like 40K", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        approvedAmount: "40K USDC",
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(true);
      expect(result.displayAmount).toBe("40K");
      expect(result.currency).toBe("USDC");
    });
  });

  describe("when only details.amount is present (attestation data)", () => {
    it("should use details.amount when approvedAmount is not set", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        details: {
          title: "Test Grant",
          amount: "100000",
          currency: "USDC",
        },
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(true);
      expect(result.isFromFinancialConfig).toBe(false);
      expect(result.rawAmount).toBe("100000");
      expect(result.displayAmount).toBe("100K");
      expect(result.currency).toBe("USDC");
    });

    it("should handle amount with embedded currency", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        details: {
          title: "Test Grant",
          amount: "5686.59 USD",
        },
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(true);
      expect(result.currency).toBe("USD");
    });

    it("should handle decimal amounts", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        details: {
          title: "Test Grant",
          amount: "2500.50",
        },
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(true);
    });
  });

  describe("when root-level amount is present (legacy format)", () => {
    it("should use root-level amount when approvedAmount is not set", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        amount: "50000",
        details: {
          title: "Test Grant",
        },
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(true);
      expect(result.isFromFinancialConfig).toBe(false);
      expect(result.rawAmount).toBe("50000");
    });

    it("should prioritize approvedAmount over root-level amount", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        approvedAmount: "30000",
        amount: "50000",
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.rawAmount).toBe("30000");
      expect(result.isFromFinancialConfig).toBe(true);
    });
  });

  describe("when no amount is present", () => {
    it("should return hasAmount false when no amounts exist", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        details: {
          title: "Test Grant",
        },
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(false);
      expect(result.displayAmount).toBeUndefined();
    });

    it("should return hasAmount false when amount is zero", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        details: {
          title: "Test Grant",
          amount: "0",
        },
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle amounts with commas", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        approvedAmount: "1,000,000",
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.hasAmount).toBe(true);
      expect(result.displayAmount).toBe("1M");
    });

    it("should handle null approvedAmount", () => {
      const grant: Grant = {
        uid: "test-uid",
        chainID: 1,
        approvedAmount: null,
        details: {
          title: "Test Grant",
          amount: "50000",
        },
      };

      const result = getGrantDisplayAmount(grant);

      expect(result.isFromFinancialConfig).toBe(false);
      expect(result.rawAmount).toBe("50000");
    });
  });
});

describe("getGrantAmountDisplay", () => {
  it("should return formatted amount for valid grant", () => {
    const grant: Grant = {
      uid: "test-uid",
      chainID: 1,
      approvedAmount: "80000",
    };

    const result = getGrantAmountDisplay(grant);

    expect(result).toBe("80K");
  });

  it("should return undefined when no valid amount exists", () => {
    const grant: Grant = {
      uid: "test-uid",
      chainID: 1,
      details: {
        title: "Test Grant",
      },
    };

    const result = getGrantAmountDisplay(grant);

    expect(result).toBeUndefined();
  });

  it("should return undefined for null grant", () => {
    const result = getGrantAmountDisplay(null);

    expect(result).toBeUndefined();
  });
});
