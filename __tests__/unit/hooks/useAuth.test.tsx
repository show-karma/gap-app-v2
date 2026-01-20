/**
 * @file Tests for useAuth hook
 * @description Tests cache invalidation on logout using centralized QUERY_KEYS
 */

import { QUERY_KEYS } from "@/utilities/queryKeys";

describe("useAuth - Query Key Consistency", () => {
  describe("QUERY_KEYS structure for cache invalidation", () => {
    it("should have AUTH.STAFF_AUTHORIZATION_BASE key defined", () => {
      expect(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE).toBeDefined();
      expect(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE).toEqual(["staffAuthorization"]);
    });

    it("should have AUTH.CONTRACT_OWNER_BASE key defined", () => {
      expect(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE).toBeDefined();
      expect(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE).toEqual(["contract-owner"]);
    });

    it("should have COMMUNITY.IS_ADMIN_BASE key defined", () => {
      expect(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE).toBeDefined();
      expect(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE).toEqual(["isCommunityAdmin"]);
    });

    it("should have full key factories that start with base keys", () => {
      // Full keys should be prefixed with base keys for removeQueries to work
      const fullAdminKey = QUERY_KEYS.COMMUNITY.IS_ADMIN("uid", 1, "addr", {});
      const fullStaffKey = QUERY_KEYS.AUTH.STAFF_AUTHORIZATION("addr");
      const fullOwnerKey = QUERY_KEYS.AUTH.CONTRACT_OWNER("addr", 1);

      expect(fullAdminKey[0]).toBe(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE[0]);
      expect(fullStaffKey[0]).toBe(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE[0]);
      expect(fullOwnerKey[0]).toBe(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE[0]);
    });

    it("should have all necessary query key factories for auth hooks", () => {
      // Verify all auth-related keys exist
      expect(typeof QUERY_KEYS.AUTH.STAFF_AUTHORIZATION).toBe("function");
      expect(typeof QUERY_KEYS.AUTH.CONTRACT_OWNER).toBe("function");
      expect(typeof QUERY_KEYS.COMMUNITY.IS_ADMIN).toBe("function");
    });
  });

  describe("Query key format validation", () => {
    it("should return arrays for all query keys", () => {
      expect(Array.isArray(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE)).toBe(true);
      expect(Array.isArray(QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE)).toBe(true);
      expect(Array.isArray(QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE)).toBe(true);

      expect(Array.isArray(QUERY_KEYS.AUTH.STAFF_AUTHORIZATION("test"))).toBe(true);
      expect(Array.isArray(QUERY_KEYS.AUTH.CONTRACT_OWNER("test", 1))).toBe(true);
      expect(Array.isArray(QUERY_KEYS.COMMUNITY.IS_ADMIN("uid", 1, "addr", {}))).toBe(true);
    });

    it("should properly lowercase addresses in STAFF_AUTHORIZATION key", () => {
      const upperCaseAddr = "0xABCDEF1234567890";
      const key = QUERY_KEYS.AUTH.STAFF_AUTHORIZATION(upperCaseAddr);
      expect(key[1]).toBe(upperCaseAddr.toLowerCase());
    });
  });
});

describe("Cache invalidation pattern verification", () => {
  it("should document that useAuth clears these caches on logout", () => {
    // This test documents the cache keys that useAuth clears on logout
    // When adding new permission hooks, they must be added to useAuth.ts
    const cacheKeysToBeCleared = [
      QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE, // useCheckCommunityAdmin
      QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE, // useStaff
      QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE, // useContractOwner
    ];

    // Verify all keys are defined
    cacheKeysToBeCleared.forEach((key) => {
      expect(key).toBeDefined();
      expect(Array.isArray(key)).toBe(true);
      expect(key.length).toBeGreaterThan(0);
    });
  });

  it("should verify that base keys match the first element of full keys", () => {
    // This ensures removeQueries({ queryKey: BASE_KEY }) will match full keys
    // React Query uses prefix matching for removeQueries

    // isCommunityAdmin
    const adminBase = QUERY_KEYS.COMMUNITY.IS_ADMIN_BASE;
    const adminFull = QUERY_KEYS.COMMUNITY.IS_ADMIN("uid", 10, "0xaddr", {});
    expect(adminFull[0]).toBe(adminBase[0]);

    // staffAuthorization
    const staffBase = QUERY_KEYS.AUTH.STAFF_AUTHORIZATION_BASE;
    const staffFull = QUERY_KEYS.AUTH.STAFF_AUTHORIZATION("0xaddr");
    expect(staffFull[0]).toBe(staffBase[0]);

    // contract-owner
    const ownerBase = QUERY_KEYS.AUTH.CONTRACT_OWNER_BASE;
    const ownerFull = QUERY_KEYS.AUTH.CONTRACT_OWNER("0xaddr", 10);
    expect(ownerFull[0]).toBe(ownerBase[0]);
  });
});
