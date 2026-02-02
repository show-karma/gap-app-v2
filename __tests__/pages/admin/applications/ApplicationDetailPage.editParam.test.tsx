import { act, renderHook, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import type { IFundingApplication } from "@/types/funding-platform";

/**
 * Test the edit parameter URL handling logic for the ApplicationDetailPage
 *
 * The page should auto-open the edit modal when ?edit=true is present in the URL
 * but only if the application can be edited (status restrictions)
 */

// Helper function that mirrors the canEditApplication logic in the page
const canEditApplication = (app: IFundingApplication) => {
  const restrictedStatuses = ["under_review", "approved"];
  return !restrictedStatuses.includes(app.status.toLowerCase());
};

describe("ApplicationDetailPage - Edit URL Parameter", () => {
  describe("canEditApplication", () => {
    it("should return true for pending applications", () => {
      const app = { status: "pending" } as IFundingApplication;
      expect(canEditApplication(app)).toBe(true);
    });

    it("should return true for rejected applications", () => {
      const app = { status: "rejected" } as IFundingApplication;
      expect(canEditApplication(app)).toBe(true);
    });

    it("should return true for revision_requested applications", () => {
      const app = { status: "revision_requested" } as IFundingApplication;
      expect(canEditApplication(app)).toBe(true);
    });

    it("should return false for approved applications", () => {
      const app = { status: "approved" } as IFundingApplication;
      expect(canEditApplication(app)).toBe(false);
    });

    it("should return false for under_review applications", () => {
      const app = { status: "under_review" } as IFundingApplication;
      expect(canEditApplication(app)).toBe(false);
    });

    it("should handle case-insensitive status comparison", () => {
      const approvedUppercase = { status: "APPROVED" } as IFundingApplication;
      const underReviewMixed = { status: "Under_Review" } as IFundingApplication;

      expect(canEditApplication(approvedUppercase)).toBe(false);
      expect(canEditApplication(underReviewMixed)).toBe(false);
    });
  });

  describe("Edit modal auto-open logic", () => {
    /**
     * Hook to simulate the auto-open edit modal behavior
     */
    function useEditModalAutoOpen(
      shouldOpenEdit: boolean,
      application: IFundingApplication | null,
      hasAccess: boolean
    ) {
      const [isEditModalOpen, setIsEditModalOpen] = useState(false);

      useEffect(() => {
        if (shouldOpenEdit && application && hasAccess && canEditApplication(application)) {
          setIsEditModalOpen(true);
        }
      }, [shouldOpenEdit, application, hasAccess]);

      return { isEditModalOpen, setIsEditModalOpen };
    }

    it("should open edit modal when edit=true and application can be edited", () => {
      const application = { status: "pending" } as IFundingApplication;

      const { result } = renderHook(() => useEditModalAutoOpen(true, application, true));

      expect(result.current.isEditModalOpen).toBe(true);
    });

    it("should NOT open edit modal when edit=true but application cannot be edited (approved)", () => {
      const application = { status: "approved" } as IFundingApplication;

      const { result } = renderHook(() => useEditModalAutoOpen(true, application, true));

      expect(result.current.isEditModalOpen).toBe(false);
    });

    it("should NOT open edit modal when edit=true but application cannot be edited (under_review)", () => {
      const application = { status: "under_review" } as IFundingApplication;

      const { result } = renderHook(() => useEditModalAutoOpen(true, application, true));

      expect(result.current.isEditModalOpen).toBe(false);
    });

    it("should NOT open edit modal when edit=true but user has no access", () => {
      const application = { status: "pending" } as IFundingApplication;

      const { result } = renderHook(
        () => useEditModalAutoOpen(true, application, false) // hasAccess = false
      );

      expect(result.current.isEditModalOpen).toBe(false);
    });

    it("should NOT open edit modal when edit=false", () => {
      const application = { status: "pending" } as IFundingApplication;

      const { result } = renderHook(
        () => useEditModalAutoOpen(false, application, true) // shouldOpenEdit = false
      );

      expect(result.current.isEditModalOpen).toBe(false);
    });

    it("should NOT open edit modal when application is null (still loading)", () => {
      const { result } = renderHook(
        () => useEditModalAutoOpen(true, null, true) // application = null
      );

      expect(result.current.isEditModalOpen).toBe(false);
    });

    it("should open edit modal when application loads and all conditions are met", async () => {
      let application: IFundingApplication | null = null;

      const { result, rerender } = renderHook(
        ({ app, hasAccess }) => useEditModalAutoOpen(true, app, hasAccess),
        {
          initialProps: { app: application, hasAccess: true },
        }
      );

      // Initially, modal should be closed (no application)
      expect(result.current.isEditModalOpen).toBe(false);

      // Simulate application loading
      application = { status: "pending" } as IFundingApplication;
      rerender({ app: application, hasAccess: true });

      // Modal should now be open
      expect(result.current.isEditModalOpen).toBe(true);
    });
  });

  describe("URL search params parsing", () => {
    it("should correctly identify edit=true from URL params", () => {
      const searchParams = new URLSearchParams("?edit=true");
      expect(searchParams.get("edit")).toBe("true");
      expect(searchParams.get("edit") === "true").toBe(true);
    });

    it("should correctly identify when edit param is not present", () => {
      const searchParams = new URLSearchParams("");
      expect(searchParams.get("edit")).toBe(null);
      expect(searchParams.get("edit") === "true").toBe(false);
    });

    it("should correctly identify edit=false from URL params", () => {
      const searchParams = new URLSearchParams("?edit=false");
      expect(searchParams.get("edit")).toBe("false");
      expect(searchParams.get("edit") === "true").toBe(false);
    });

    it("should handle other query params without affecting edit", () => {
      const searchParams = new URLSearchParams("?tab=comments&edit=true&view=details");
      expect(searchParams.get("edit") === "true").toBe(true);
      expect(searchParams.get("tab")).toBe("comments");
      expect(searchParams.get("view")).toBe("details");
    });
  });
});
