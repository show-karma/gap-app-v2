import {
  BALANCE_CONSTANTS,
  DONATION_CONSTANTS,
  estimateDonationTime,
  formatEstimatedTime,
  getRetryDelay,
  isCacheValid,
  isCartFull,
  isCartSizeWarning,
  NETWORK_CONSTANTS,
  TRANSACTION_CONSTANTS,
  UX_CONSTANTS,
  VALIDATION_CONSTANTS,
} from "../donation";

describe("donation constants", () => {
  describe("DONATION_CONSTANTS", () => {
    it("should have correct pagination and display constants", () => {
      expect(DONATION_CONSTANTS.PROJECTS_PER_PAGE).toBe(12);
      expect(DONATION_CONSTANTS.MAX_CART_SIZE).toBe(50);
      expect(DONATION_CONSTANTS.CART_SIZE_WARNING_THRESHOLD).toBe(40);
      expect(DONATION_CONSTANTS.MAX_BATCH_SIZE).toBe(20);
    });
  });

  describe("BALANCE_CONSTANTS", () => {
    it("should have correct cache and timeout constants", () => {
      expect(BALANCE_CONSTANTS.CACHE_TTL_MS).toBe(5 * 60 * 1000);
      expect(BALANCE_CONSTANTS.FETCH_TIMEOUT_MS).toBe(10_000);
      expect(BALANCE_CONSTANTS.SLOW_FETCH_WARNING_THRESHOLD_MS).toBe(5_000);
    });
  });

  describe("NETWORK_CONSTANTS", () => {
    it("should have correct retry and switching constants", () => {
      expect(NETWORK_CONSTANTS.SWITCH_MAX_RETRIES).toBe(3);
      expect(NETWORK_CONSTANTS.RETRY_DELAYS_MS).toEqual([1_000, 2_000, 4_000]);
      expect(NETWORK_CONSTANTS.WALLET_SYNC_MAX_ATTEMPTS).toBe(10);
      expect(NETWORK_CONSTANTS.WALLET_SYNC_DELAY_MS).toBe(1_000);
    });
  });

  describe("UX_CONSTANTS", () => {
    it("should have correct toast duration constants", () => {
      expect(UX_CONSTANTS.SUCCESS_TOAST_DURATION_MS).toBe(3_000);
      expect(UX_CONSTANTS.ERROR_TOAST_DURATION_MS).toBe(5_000);
      expect(UX_CONSTANTS.LOADING_TOAST_DURATION_MS).toBe(2_000);
    });

    it("should have correct estimated time constants", () => {
      expect(UX_CONSTANTS.ESTIMATED_NETWORK_SWITCH_TIME_SECONDS).toBe(30);
      expect(UX_CONSTANTS.ESTIMATED_APPROVAL_TIME_SECONDS).toBe(20);
      expect(UX_CONSTANTS.ESTIMATED_DONATION_TIME_SECONDS).toBe(15);
    });
  });

  describe("TRANSACTION_CONSTANTS", () => {
    it("should have correct confirmation constants", () => {
      expect(TRANSACTION_CONSTANTS.REQUIRED_CONFIRMATIONS).toBe(3);
    });
  });

  describe("VALIDATION_CONSTANTS", () => {
    it("should have correct validation constants", () => {
      expect(VALIDATION_CONSTANTS.MIN_DONATION_AMOUNT).toBe(0.000001);
      expect(VALIDATION_CONSTANTS.MAX_DONATION_AMOUNT).toBe(1_000_000_000);
      expect(VALIDATION_CONSTANTS.DISPLAY_DECIMALS).toBe(4);
      expect(VALIDATION_CONSTANTS.BALANCE_CHECK_DECIMALS).toBe(6);
    });
  });

  describe("estimateDonationTime", () => {
    it("should calculate correct total time for single donation", () => {
      const time = estimateDonationTime(1, 1, 1);
      expect(time).toBe(30 + 20 + 15);
    });

    it("should calculate correct time for multiple donations", () => {
      const time = estimateDonationTime(2, 3, 5);
      expect(time).toBe(2 * 30 + 3 * 20 + 5 * 15);
    });

    it("should handle zero operations", () => {
      expect(estimateDonationTime(0, 0, 0)).toBe(0);
    });

    it("should handle only network switches", () => {
      const time = estimateDonationTime(3, 0, 0);
      expect(time).toBe(90);
    });

    it("should handle only approvals", () => {
      const time = estimateDonationTime(0, 4, 0);
      expect(time).toBe(80);
    });

    it("should handle only donations", () => {
      const time = estimateDonationTime(0, 0, 5);
      expect(time).toBe(75);
    });
  });

  describe("formatEstimatedTime", () => {
    it("should format seconds for times under 1 minute", () => {
      expect(formatEstimatedTime(30)).toBe("~30 seconds");
      expect(formatEstimatedTime(59)).toBe("~59 seconds");
      expect(formatEstimatedTime(1)).toBe("~1 seconds");
    });

    it("should format minutes for times over 1 minute", () => {
      expect(formatEstimatedTime(60)).toBe("~1 minute");
      expect(formatEstimatedTime(90)).toBe("~2 minutes");
      expect(formatEstimatedTime(120)).toBe("~2 minutes");
      expect(formatEstimatedTime(150)).toBe("~3 minutes");
    });

    it("should use singular minute for exactly 60 seconds", () => {
      expect(formatEstimatedTime(60)).toBe("~1 minute");
    });

    it("should use plural minutes for multiple minutes", () => {
      expect(formatEstimatedTime(61)).toBe("~2 minutes");
      expect(formatEstimatedTime(119)).toBe("~2 minutes");
      expect(formatEstimatedTime(121)).toBe("~3 minutes");
    });

    it("should handle zero seconds", () => {
      expect(formatEstimatedTime(0)).toBe("~0 seconds");
    });

    it("should handle large values", () => {
      expect(formatEstimatedTime(3600)).toBe("~60 minutes");
    });
  });

  describe("isCartSizeWarning", () => {
    it("should return false below warning threshold", () => {
      expect(isCartSizeWarning(0)).toBe(false);
      expect(isCartSizeWarning(20)).toBe(false);
      expect(isCartSizeWarning(39)).toBe(false);
    });

    it("should return true at warning threshold", () => {
      expect(isCartSizeWarning(40)).toBe(true);
    });

    it("should return true above warning threshold", () => {
      expect(isCartSizeWarning(41)).toBe(true);
      expect(isCartSizeWarning(45)).toBe(true);
      expect(isCartSizeWarning(49)).toBe(true);
    });

    it("should return true at max cart size", () => {
      expect(isCartSizeWarning(50)).toBe(true);
    });

    it("should return true beyond max cart size", () => {
      expect(isCartSizeWarning(51)).toBe(true);
      expect(isCartSizeWarning(100)).toBe(true);
    });
  });

  describe("isCartFull", () => {
    it("should return false below max cart size", () => {
      expect(isCartFull(0)).toBe(false);
      expect(isCartFull(25)).toBe(false);
      expect(isCartFull(49)).toBe(false);
    });

    it("should return true at max cart size", () => {
      expect(isCartFull(50)).toBe(true);
    });

    it("should return true beyond max cart size", () => {
      expect(isCartFull(51)).toBe(true);
      expect(isCartFull(100)).toBe(true);
    });
  });

  describe("getRetryDelay", () => {
    it("should return correct delays for valid attempt numbers", () => {
      expect(getRetryDelay(0)).toBe(1_000);
      expect(getRetryDelay(1)).toBe(2_000);
      expect(getRetryDelay(2)).toBe(4_000);
    });

    it("should return last delay for attempts beyond array length", () => {
      expect(getRetryDelay(3)).toBe(4_000);
      expect(getRetryDelay(4)).toBe(4_000);
      expect(getRetryDelay(10)).toBe(4_000);
    });

    it("should handle edge cases", () => {
      expect(getRetryDelay(0)).toBe(1_000);
      expect(getRetryDelay(100)).toBe(4_000);
    });
  });

  describe("isCacheValid", () => {
    it("should return true for recent timestamps", () => {
      const now = Date.now();
      expect(isCacheValid(now)).toBe(true);
      expect(isCacheValid(now - 1000)).toBe(true);
      expect(isCacheValid(now - 60_000)).toBe(true);
      expect(isCacheValid(now - 4 * 60_000)).toBe(true);
    });

    it("should return true at cache TTL boundary", () => {
      const now = Date.now();
      const almostExpired = now - (5 * 60 * 1000 - 1);
      expect(isCacheValid(almostExpired)).toBe(true);
    });

    it("should return false for expired timestamps", () => {
      const now = Date.now();
      const expired = now - (5 * 60 * 1000 + 1);
      expect(isCacheValid(expired)).toBe(false);
    });

    it("should return false for old timestamps", () => {
      const veryOld = Date.now() - 10 * 60 * 1000;
      expect(isCacheValid(veryOld)).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isCacheValid(0)).toBe(false);
      expect(isCacheValid(Date.now() - 1_000_000_000)).toBe(false);
    });
  });

  describe("integration tests", () => {
    it("should have consistent warning and full thresholds", () => {
      expect(DONATION_CONSTANTS.CART_SIZE_WARNING_THRESHOLD).toBeLessThan(
        DONATION_CONSTANTS.MAX_CART_SIZE
      );
    });

    it("should have logical batch size constraints", () => {
      expect(DONATION_CONSTANTS.MAX_BATCH_SIZE).toBeLessThanOrEqual(
        DONATION_CONSTANTS.MAX_CART_SIZE
      );
    });

    it("should have increasing retry delays", () => {
      const delays = NETWORK_CONSTANTS.RETRY_DELAYS_MS;
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThan(delays[i - 1]);
      }
    });

    it("should have logical validation amounts", () => {
      expect(VALIDATION_CONSTANTS.MIN_DONATION_AMOUNT).toBeLessThan(
        VALIDATION_CONSTANTS.MAX_DONATION_AMOUNT
      );
    });

    it("should have reasonable timeout values", () => {
      expect(BALANCE_CONSTANTS.FETCH_TIMEOUT_MS).toBeGreaterThan(
        BALANCE_CONSTANTS.SLOW_FETCH_WARNING_THRESHOLD_MS
      );
    });
  });
});
