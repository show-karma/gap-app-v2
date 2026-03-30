import { act } from "@testing-library/react";
import { type ProgressModalScreen, useProgressModalStore } from "@/store/modals/progress";

describe("useProgressModalStore", () => {
  beforeEach(() => {
    // Reset the store to initial state
    act(() => {
      useProgressModalStore.getState().closeProgressModal();
    });
  });

  describe("initial state", () => {
    it("starts with modal closed", () => {
      expect(useProgressModalStore.getState().isProgressModalOpen).toBe(false);
    });

    it("starts with 'menu' screen", () => {
      expect(useProgressModalStore.getState().progressModalScreen).toBe("menu");
    });

    it("starts with null preSelectedGrantId", () => {
      expect(useProgressModalStore.getState().preSelectedGrantId).toBeNull();
    });
  });

  describe("setIsProgressModalOpen", () => {
    it("opens the modal", () => {
      act(() => {
        useProgressModalStore.getState().setIsProgressModalOpen(true);
      });
      expect(useProgressModalStore.getState().isProgressModalOpen).toBe(true);
    });

    it("closes the modal without resetting screen", () => {
      act(() => {
        useProgressModalStore.getState().setProgressModalScreen("milestone");
        useProgressModalStore.getState().setIsProgressModalOpen(true);
      });

      act(() => {
        useProgressModalStore.getState().setIsProgressModalOpen(false);
      });

      // setIsProgressModalOpen alone does not reset screen
      expect(useProgressModalStore.getState().isProgressModalOpen).toBe(false);
      expect(useProgressModalStore.getState().progressModalScreen).toBe("milestone");
    });
  });

  describe("setProgressModalScreen", () => {
    it.each<ProgressModalScreen>([
      "menu",
      "project_update",
      "milestone",
      "milestone_update",
      "unified_milestone",
    ])("sets screen to '%s'", (screen) => {
      act(() => {
        useProgressModalStore.getState().setProgressModalScreen(screen);
      });
      expect(useProgressModalStore.getState().progressModalScreen).toBe(screen);
    });
  });

  describe("closeProgressModal", () => {
    it("closes modal, resets screen to menu, and clears grantId", () => {
      act(() => {
        useProgressModalStore.getState().openProgressModalWithScreen("milestone", "grant-123");
      });

      expect(useProgressModalStore.getState().isProgressModalOpen).toBe(true);

      act(() => {
        useProgressModalStore.getState().closeProgressModal();
      });

      const state = useProgressModalStore.getState();
      expect(state.isProgressModalOpen).toBe(false);
      expect(state.progressModalScreen).toBe("menu");
      expect(state.preSelectedGrantId).toBeNull();
    });
  });

  describe("setPreSelectedGrantId", () => {
    it("sets a grant ID", () => {
      act(() => {
        useProgressModalStore.getState().setPreSelectedGrantId("grant-456");
      });
      expect(useProgressModalStore.getState().preSelectedGrantId).toBe("grant-456");
    });

    it("clears grant ID with null", () => {
      act(() => {
        useProgressModalStore.getState().setPreSelectedGrantId("grant-456");
      });
      act(() => {
        useProgressModalStore.getState().setPreSelectedGrantId(null);
      });
      expect(useProgressModalStore.getState().preSelectedGrantId).toBeNull();
    });
  });

  describe("openProgressModalWithScreen", () => {
    it("opens modal with specified screen and grantId", () => {
      act(() => {
        useProgressModalStore
          .getState()
          .openProgressModalWithScreen("milestone_update", "grant-789");
      });

      const state = useProgressModalStore.getState();
      expect(state.isProgressModalOpen).toBe(true);
      expect(state.progressModalScreen).toBe("milestone_update");
      expect(state.preSelectedGrantId).toBe("grant-789");
    });

    it("sets preSelectedGrantId to null when grantId is omitted", () => {
      act(() => {
        useProgressModalStore.getState().openProgressModalWithScreen("project_update");
      });

      const state = useProgressModalStore.getState();
      expect(state.isProgressModalOpen).toBe(true);
      expect(state.progressModalScreen).toBe("project_update");
      expect(state.preSelectedGrantId).toBeNull();
    });

    it("overrides previous state completely", () => {
      act(() => {
        useProgressModalStore.getState().openProgressModalWithScreen("milestone", "grant-a");
      });
      act(() => {
        useProgressModalStore
          .getState()
          .openProgressModalWithScreen("unified_milestone", "grant-b");
      });

      const state = useProgressModalStore.getState();
      expect(state.progressModalScreen).toBe("unified_milestone");
      expect(state.preSelectedGrantId).toBe("grant-b");
    });
  });

  describe("open-close-reopen cycle", () => {
    it("properly resets state between open/close cycles", () => {
      // Open with specific screen and grant
      act(() => {
        useProgressModalStore.getState().openProgressModalWithScreen("milestone", "grant-1");
      });

      // Close
      act(() => {
        useProgressModalStore.getState().closeProgressModal();
      });

      // Verify reset
      const afterClose = useProgressModalStore.getState();
      expect(afterClose.isProgressModalOpen).toBe(false);
      expect(afterClose.progressModalScreen).toBe("menu");
      expect(afterClose.preSelectedGrantId).toBeNull();

      // Reopen with different screen
      act(() => {
        useProgressModalStore.getState().openProgressModalWithScreen("project_update");
      });

      const afterReopen = useProgressModalStore.getState();
      expect(afterReopen.isProgressModalOpen).toBe(true);
      expect(afterReopen.progressModalScreen).toBe("project_update");
      expect(afterReopen.preSelectedGrantId).toBeNull();
    });
  });
});
