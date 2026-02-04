/**
 * Tests for MilestoneDelete component
 *
 * These tests verify that the MilestoneDelete component correctly:
 * 1. Imports and uses the grant store for refreshGrant
 * 2. Calls refreshGrant in all onSuccess callbacks
 *
 * The fix addressed the issue where the page didn't update after deletion
 * because the Zustand grant store wasn't being refreshed.
 *
 * Issue #3: Delete milestone update at /milestones-and-updates does the POST
 * request but doesn't update the page.
 *
 * Root cause: The MilestoneDelete component was only refreshing the React Query
 * cache via refetchGrants, but not updating the Zustand grant store that the UI
 * renders from.
 *
 * Fix: Added refreshGrant() calls from useGrantStore to the onSuccess callbacks
 * for all deletion paths (off-chain, on-chain, and fallback).
 */

import * as fs from "fs";
import * as path from "path";

describe("MilestoneDelete", () => {
  const componentPath = path.join(
    process.cwd(),
    "components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestoneDelete.tsx"
  );

  let componentCode: string;

  beforeAll(() => {
    componentCode = fs.readFileSync(componentPath, "utf-8");
  });

  describe("Fix Verification: Grant Store Integration", () => {
    it("should import useGrantStore from @/store/grant", () => {
      expect(componentCode).toContain('import { useGrantStore } from "@/store/grant"');
    });

    it("should destructure refreshGrant from useGrantStore", () => {
      expect(componentCode).toContain("const { refreshGrant } = useGrantStore()");
    });

    it("should call refreshGrant at least 3 times (off-chain, on-chain, fallback)", () => {
      const refreshGrantCalls = (componentCode.match(/await refreshGrant\(\)/g) || []).length;
      expect(refreshGrantCalls).toBeGreaterThanOrEqual(3);
    });

    it("should have refreshGrant in the first onSuccess callback (off-chain path)", () => {
      // The off-chain path has onSuccess inside performOffChainRevoke call
      const offChainSection = componentCode.substring(
        componentCode.indexOf("if (!isOnChainAuthorized)"),
        componentCode.indexOf("} else {", componentCode.indexOf("if (!isOnChainAuthorized)"))
      );
      expect(offChainSection).toContain("onSuccess: async () => {");
      expect(offChainSection).toContain("await refreshGrant()");
    });

    it("should have refreshGrant in checkIfAttestationExists callback (on-chain path)", () => {
      // The on-chain path has refreshGrant inside checkIfAttestationExists callback
      const onChainSection = componentCode.substring(
        componentCode.indexOf("} else {", componentCode.indexOf("if (!isOnChainAuthorized)")),
        componentCode.indexOf("} catch (onChainError")
      );
      expect(onChainSection).toContain("await checkIfAttestationExists(async ()");
      expect(onChainSection).toContain("await refreshGrant()");
    });

    it("should have refreshGrant in fallback onSuccess callback", () => {
      // The fallback path is inside the catch block
      const fallbackSection = componentCode.substring(
        componentCode.indexOf("} catch (onChainError"),
        componentCode.indexOf("if (!success)")
      );
      expect(fallbackSection).toContain("onSuccess: async () => {");
      expect(fallbackSection).toContain("await refreshGrant()");
    });
  });

  describe("Comment Documentation", () => {
    it("should have comments explaining the UI refresh purpose", () => {
      const refreshComments = (
        componentCode.match(/\/\/ Refresh the grant store to update the UI/g) || []
      ).length;
      expect(refreshComments).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Code Structure", () => {
    it("should still import useProjectGrants for React Query cache refresh", () => {
      expect(componentCode).toContain(
        'import { useProjectGrants } from "@/hooks/v2/useProjectGrants"'
      );
    });

    it("should still call refetchGrants for React Query cache invalidation", () => {
      expect(componentCode).toContain("refetchGrants");
    });

    it("should use async onSuccess callbacks to properly await refreshGrant", () => {
      // All onSuccess callbacks should be async to properly await refreshGrant
      const asyncOnSuccessCount = (componentCode.match(/onSuccess: async \(\)/g) || []).length;
      expect(asyncOnSuccessCount).toBeGreaterThanOrEqual(2);
    });
  });
});
