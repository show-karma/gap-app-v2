/**
 * @file Tests for grantCompletionHelpers utilities
 * @description Tests validation, payload building, and completion checking utilities
 */

jest.mock("@/utilities/retries", () => ({
  retryUntilConditionMet: jest.fn(),
}));

jest.mock("@/services/project-grants.service", () => ({
  getProjectGrants: jest.fn(),
}));

import {
  buildRevocationPayload,
  createCheckIfCompletionExists,
  validateGrantCompletion,
} from "@/utilities/grantCompletionHelpers";

// Get the mocked functions after jest.mock
const { retryUntilConditionMet } = require("@/utilities/retries");
const mockRetryUntilConditionMet = retryUntilConditionMet as jest.MockedFunction<
  typeof retryUntilConditionMet
>;

const { getProjectGrants } = require("@/services/project-grants.service");
const mockGetProjectGrants = getProjectGrants as jest.MockedFunction<typeof getProjectGrants>;

describe("grantCompletionHelpers", () => {
  describe("validateGrantCompletion", () => {
    it("should throw error when completion is null", () => {
      expect(() => validateGrantCompletion(null)).toThrow("Grant completion not found");
    });

    it("should throw error when completion is undefined", () => {
      expect(() => validateGrantCompletion(undefined)).toThrow("Grant completion not found");
    });

    it("should throw error when schema.revocable is not true", () => {
      const completion = {
        schema: { revocable: false },
        revoked: false,
      };
      expect(() => validateGrantCompletion(completion)).toThrow(
        "Grant completion is not revocable"
      );
    });

    it("should throw error when schema.revocable is undefined", () => {
      const completion = {
        schema: {},
        revoked: false,
      };
      expect(() => validateGrantCompletion(completion)).toThrow(
        "Grant completion is not revocable"
      );
    });

    it("should throw error when schema is null", () => {
      const completion = {
        schema: null,
        revoked: false,
      };
      expect(() => validateGrantCompletion(completion)).toThrow(
        "Grant completion is not revocable"
      );
    });

    it("should throw error when revoked is true", () => {
      const completion = {
        schema: { revocable: true },
        revoked: true,
      };
      expect(() => validateGrantCompletion(completion)).toThrow("Grant completion already revoked");
    });

    it("should pass validation for valid revocable completion", () => {
      const completion = {
        schema: { revocable: true },
        revoked: false,
      };
      expect(() => validateGrantCompletion(completion)).not.toThrow();
    });

    it("should pass validation when revoked is null", () => {
      const completion = {
        schema: { revocable: true },
        revoked: null,
      };
      expect(() => validateGrantCompletion(completion)).not.toThrow();
    });

    it("should pass validation when revoked is undefined", () => {
      const completion = {
        schema: { revocable: true },
        revoked: undefined,
      };
      expect(() => validateGrantCompletion(completion)).not.toThrow();
    });

    it("should pass validation when revoked is false", () => {
      const completion = {
        schema: { revocable: true },
        revoked: false,
      };
      expect(() => validateGrantCompletion(completion)).not.toThrow();
    });
  });

  describe("buildRevocationPayload", () => {
    it("should return correct structure with schema and data array", () => {
      const result = buildRevocationPayload("0xschema123", "0xattestation123");

      expect(result).toEqual([
        {
          schema: "0xschema123",
          data: [
            {
              uid: "0xattestation123",
              value: 0n,
            },
          ],
        },
      ]);
    });

    it("should convert schemaUID to hex string type", () => {
      const result = buildRevocationPayload("schema123", "0xattestation123");

      expect(result[0].schema).toBe("schema123");
      expect(typeof result[0].schema).toBe("string");
    });

    it("should convert attestationUID to hex string type", () => {
      const result = buildRevocationPayload("0xschema123", "attestation123");

      expect(result[0].data[0].uid).toBe("attestation123");
      expect(typeof result[0].data[0].uid).toBe("string");
    });

    it("should use default value of 0n for value parameter", () => {
      const result = buildRevocationPayload("0xschema123", "0xattestation123");

      expect(result[0].data[0].value).toBe(0n);
    });

    it("should accept custom value parameter", () => {
      const customValue = 1000n;
      const result = buildRevocationPayload("0xschema123", "0xattestation123", customValue);

      expect(result[0].data[0].value).toBe(customValue);
    });

    it("should return array with single object containing schema and data", () => {
      const result = buildRevocationPayload("0xschema123", "0xattestation123");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty("schema");
      expect(result[0]).toHaveProperty("data");
      expect(Array.isArray(result[0].data)).toBe(true);
      expect(result[0].data.length).toBe(1);
    });

    it("should handle large value", () => {
      const largeValue = BigInt("1000000000000000000");
      const result = buildRevocationPayload("0xschema123", "0xattestation123", largeValue);

      expect(result[0].data[0].value).toBe(largeValue);
    });
  });

  describe("createCheckIfCompletionExists", () => {
    const grantUID = "grant-123";
    const projectIdOrSlug = "project-456";

    beforeEach(() => {
      jest.clearAllMocks();
      mockRetryUntilConditionMet.mockResolvedValue(undefined);
      mockGetProjectGrants.mockResolvedValue([]);
    });

    it("should return async function", () => {
      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);

      expect(typeof checkFn).toBe("function");
      expect(checkFn.constructor.name).toBe("AsyncFunction");
    });

    it("should call getProjectGrants with projectIdOrSlug", async () => {
      mockGetProjectGrants.mockResolvedValue([]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn();

      expect(mockRetryUntilConditionMet).toHaveBeenCalled();
      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      await conditionFn();

      expect(mockGetProjectGrants).toHaveBeenCalledWith(projectIdOrSlug);
    });

    it("should return true when project has no grants", async () => {
      mockGetProjectGrants.mockResolvedValue([]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn();

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();

      expect(result).toBe(true);
    });

    it("should return true when grant doesn't exist", async () => {
      mockGetProjectGrants.mockResolvedValue([
        { uid: "grant-456", completed: true },
        { uid: "grant-789", completed: false },
      ]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn();

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();

      expect(result).toBe(true);
    });

    it("should return true when grant.completed is falsy", async () => {
      mockGetProjectGrants.mockResolvedValue([{ uid: grantUID, completed: null }]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn();

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();

      expect(result).toBe(true);
    });

    it("should return true when grant.completed is false", async () => {
      mockGetProjectGrants.mockResolvedValue([{ uid: grantUID, completed: false }]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn();

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();

      expect(result).toBe(true);
    });

    it("should return false when grant.completed exists", async () => {
      mockGetProjectGrants.mockResolvedValue([
        { uid: grantUID, completed: { uid: "0xcompletion123" } },
      ]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn();

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();

      expect(result).toBe(false);
    });

    it("should call callbackFn when condition is met", async () => {
      const callbackFn = jest.fn();
      mockRetryUntilConditionMet.mockImplementation(
        async (conditionFn: () => Promise<boolean>, cb?: () => void) => {
          const result = await conditionFn();
          if (result) {
            cb?.();
          }
        }
      );
      mockGetProjectGrants.mockResolvedValue([]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn(callbackFn);

      expect(callbackFn).toHaveBeenCalled();
    });

    it("should use retryUntilConditionMet with correct parameters", async () => {
      mockGetProjectGrants.mockResolvedValue([{ uid: grantUID, completed: null }]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn();

      expect(mockRetryUntilConditionMet).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should handle retry logic properly", async () => {
      mockRetryUntilConditionMet.mockImplementation(
        async (conditionFn: () => Promise<boolean>, cb?: () => void) => {
          const result = await conditionFn();
          if (result) {
            cb?.();
          } else {
            // Simulate retry
            await new Promise((resolve) => setTimeout(resolve, 10));
            const result2 = await conditionFn();
            if (result2) {
              cb?.();
            }
          }
        }
      );

      // First call returns false (completion exists), second returns true (removed)
      mockGetProjectGrants
        .mockResolvedValueOnce([{ uid: grantUID, completed: { uid: "0xcompletion123" } }])
        .mockResolvedValueOnce([{ uid: grantUID, completed: null }]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn();

      expect(mockGetProjectGrants).toHaveBeenCalled();
    });

    /**
     * Tests case-sensitive grant UID matching behavior
     *
     * This test documents the current implementation behavior where grant UID matching
     * is case-sensitive using strict equality (===). The function in grantCompletionHelpers.ts
     * uses `g.uid === grantUID` for comparison, which means 'GRANT-123' !== 'grant-123'.
     *
     * Current behavior: Case-sensitive matching
     * - 'GRANT-123' will NOT match 'grant-123'
     * - This means if a grant UID has different casing, it won't be found
     * - Result: true (completion considered removed because grant not found)
     *
     * Note: The hook useGrantCompletionRevoke uses case-insensitive matching via toLowerCase(),
     * but this helper function does not. This test ensures the helper's behavior is documented.
     *
     * Future consideration: Case-insensitive matching could be added as an enhancement
     * by using: g.uid.toLowerCase() === grantUID.toLowerCase()
     *
     * See: utilities/grantCompletionHelpers.ts:22-24
     */
    it("should handle case-sensitive grant UID matching", async () => {
      const upperCaseGrantUID = "GRANT-123";
      mockGetProjectGrants.mockResolvedValue([
        { uid: grantUID.toLowerCase(), completed: { uid: "0xcompletion123" } },
      ]);

      const checkFn = createCheckIfCompletionExists(upperCaseGrantUID, projectIdOrSlug);
      await checkFn();

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();

      // The function uses === for comparison (case-sensitive)
      // Since 'GRANT-123' !== 'grant-123', grant is not found, so result is true
      expect(result).toBe(true);
    });

    it("should handle empty grants array", async () => {
      mockGetProjectGrants.mockResolvedValue([]);

      const checkFn = createCheckIfCompletionExists(grantUID, projectIdOrSlug);
      await checkFn();

      const conditionFn = mockRetryUntilConditionMet.mock.calls[0][0];
      const result = await conditionFn();

      expect(result).toBe(true);
    });
  });
});
