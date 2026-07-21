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
 * Fix: refreshGrant() from useGrantStore runs after a confirmed-successful
 * revoke on all deletion paths (off-chain, on-chain, and fallback). Since the
 * revoke primitive now throws on failure, success no longer routes through an
 * onSuccess callback — the refresh runs directly after the resolved await.
 */

import * as fs from "node:fs";
import * as path from "node:path";

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

    it("should obtain refreshGrant from useGrantStore", () => {
      expect(componentCode).toContain(
        "const refreshGrant = useGrantStore((state) => state.refreshGrant)"
      );
    });

    it("should call refreshGrant at least 3 times (off-chain, on-chain, fallback)", () => {
      const refreshGrantCalls = (componentCode.match(/await refreshGrant\(\)/g) || []).length;
      expect(refreshGrantCalls).toBeGreaterThanOrEqual(3);
    });

    it("should refresh the grant after the off-chain revoke resolves", () => {
      // The off-chain path runs refreshGrant after the awaited revoke succeeds.
      const offChainSection = componentCode.substring(
        componentCode.indexOf("if (!isOnChainAuthorized)"),
        componentCode.indexOf("} else {", componentCode.indexOf("if (!isOnChainAuthorized)"))
      );
      expect(offChainSection).toContain("await performOffChainRevoke(");
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

    it("should refresh the grant after the fallback off-chain revoke resolves", () => {
      // The fallback path refreshes only after the awaited off-chain revoke
      // succeeds (inside the inner try, before the original-error rethrow).
      const fallbackSection = componentCode.substring(
        componentCode.indexOf("} catch (onChainError"),
        componentCode.indexOf("throw onChainError")
      );
      expect(fallbackSection).toContain("await performOffChainRevoke(");
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

    it("should await refreshGrant after each successful revoke path", () => {
      // refreshGrant is awaited on the off-chain, on-chain, and fallback paths.
      const awaitedRefreshCount = (componentCode.match(/await refreshGrant\(\)/g) || []).length;
      expect(awaitedRefreshCount).toBeGreaterThanOrEqual(3);
    });
  });
});
