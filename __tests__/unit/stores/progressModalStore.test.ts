import { act, renderHook } from "@testing-library/react";
import { useProgressModalStore } from "@/store/modals/progress";

describe("useProgressModalStore", () => {
  beforeEach(() => {
    // Reset the store state before each test
    const { result } = renderHook(() => useProgressModalStore());
    act(() => {
      result.current.closeProgressModal();
    });
  });

  describe("initial state", () => {
    it("should have modal closed by default", () => {
      const { result } = renderHook(() => useProgressModalStore());
      expect(result.current.isProgressModalOpen).toBe(false);
    });

    it("should have menu as default screen", () => {
      const { result } = renderHook(() => useProgressModalStore());
      expect(result.current.progressModalScreen).toBe("menu");
    });

    it("should have no pre-selected grant by default", () => {
      const { result } = renderHook(() => useProgressModalStore());
      expect(result.current.preSelectedGrantId).toBeNull();
    });
  });

  describe("setIsProgressModalOpen", () => {
    it("should open the modal", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.setIsProgressModalOpen(true);
      });

      expect(result.current.isProgressModalOpen).toBe(true);
    });

    it("should close the modal", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.setIsProgressModalOpen(true);
      });
      act(() => {
        result.current.setIsProgressModalOpen(false);
      });

      expect(result.current.isProgressModalOpen).toBe(false);
    });
  });

  describe("setProgressModalScreen", () => {
    it("should change the screen to unified_milestone", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.setProgressModalScreen("unified_milestone");
      });

      expect(result.current.progressModalScreen).toBe("unified_milestone");
    });

    it("should change the screen to project_update", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.setProgressModalScreen("project_update");
      });

      expect(result.current.progressModalScreen).toBe("project_update");
    });
  });

  describe("closeProgressModal", () => {
    it("should close the modal and reset to menu screen", () => {
      const { result } = renderHook(() => useProgressModalStore());

      // First open the modal and set a different screen
      act(() => {
        result.current.setIsProgressModalOpen(true);
        result.current.setProgressModalScreen("unified_milestone");
        result.current.setPreSelectedGrantId("grant-123");
      });

      // Then close it
      act(() => {
        result.current.closeProgressModal();
      });

      expect(result.current.isProgressModalOpen).toBe(false);
      expect(result.current.progressModalScreen).toBe("menu");
      expect(result.current.preSelectedGrantId).toBeNull();
    });
  });

  describe("setPreSelectedGrantId", () => {
    it("should set the pre-selected grant ID", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.setPreSelectedGrantId("grant-456");
      });

      expect(result.current.preSelectedGrantId).toBe("grant-456");
    });

    it("should clear the pre-selected grant ID when set to null", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.setPreSelectedGrantId("grant-789");
      });
      act(() => {
        result.current.setPreSelectedGrantId(null);
      });

      expect(result.current.preSelectedGrantId).toBeNull();
    });
  });

  describe("openProgressModalWithScreen", () => {
    it("should open modal with specified screen and no grant", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.openProgressModalWithScreen("unified_milestone");
      });

      expect(result.current.isProgressModalOpen).toBe(true);
      expect(result.current.progressModalScreen).toBe("unified_milestone");
      expect(result.current.preSelectedGrantId).toBeNull();
    });

    it("should open modal with specified screen and pre-selected grant", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.openProgressModalWithScreen("unified_milestone", "grant-abc");
      });

      expect(result.current.isProgressModalOpen).toBe(true);
      expect(result.current.progressModalScreen).toBe("unified_milestone");
      expect(result.current.preSelectedGrantId).toBe("grant-abc");
    });

    it("should work with milestone_update screen", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.openProgressModalWithScreen("milestone_update", "grant-xyz");
      });

      expect(result.current.isProgressModalOpen).toBe(true);
      expect(result.current.progressModalScreen).toBe("milestone_update");
      expect(result.current.preSelectedGrantId).toBe("grant-xyz");
    });

    it("should work with project_update screen without grant", () => {
      const { result } = renderHook(() => useProgressModalStore());

      act(() => {
        result.current.openProgressModalWithScreen("project_update");
      });

      expect(result.current.isProgressModalOpen).toBe(true);
      expect(result.current.progressModalScreen).toBe("project_update");
      expect(result.current.preSelectedGrantId).toBeNull();
    });
  });
});
