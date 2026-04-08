import { act } from "@testing-library/react";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useOwnerStore } from "@/store/owner";

describe("useOwnerStore", () => {
  beforeEach(() => {
    act(() => {
      useOwnerStore.setState({
        isOwner: false,
        isOwnerLoading: true,
      });
    });
  });

  describe("initial state", () => {
    it("starts with isOwner as false", () => {
      expect(useOwnerStore.getState().isOwner).toBe(false);
    });

    it("starts with isOwnerLoading as true to prevent flash", () => {
      // Default is true to prevent flash of "not authorized" before
      // useContractOwner completes its first check
      expect(useOwnerStore.getState().isOwnerLoading).toBe(true);
    });
  });

  describe("setIsOwner", () => {
    it("sets isOwner to true", () => {
      act(() => {
        useOwnerStore.getState().setIsOwner(true);
      });
      expect(useOwnerStore.getState().isOwner).toBe(true);
    });

    it("sets isOwner to false", () => {
      act(() => {
        useOwnerStore.getState().setIsOwner(true);
      });
      act(() => {
        useOwnerStore.getState().setIsOwner(false);
      });
      expect(useOwnerStore.getState().isOwner).toBe(false);
    });
  });

  describe("setIsOwnerLoading", () => {
    it("sets loading to false when check completes", () => {
      act(() => {
        useOwnerStore.getState().setIsOwnerLoading(false);
      });
      expect(useOwnerStore.getState().isOwnerLoading).toBe(false);
    });

    it("sets loading back to true", () => {
      act(() => {
        useOwnerStore.getState().setIsOwnerLoading(false);
      });
      act(() => {
        useOwnerStore.getState().setIsOwnerLoading(true);
      });
      expect(useOwnerStore.getState().isOwnerLoading).toBe(true);
    });
  });

  describe("typical lifecycle", () => {
    it("simulates ownership check flow: loading -> owner found", () => {
      // Initially loading
      expect(useOwnerStore.getState().isOwnerLoading).toBe(true);
      expect(useOwnerStore.getState().isOwner).toBe(false);

      // Ownership check completes: user is owner
      act(() => {
        useOwnerStore.getState().setIsOwner(true);
        useOwnerStore.getState().setIsOwnerLoading(false);
      });

      expect(useOwnerStore.getState().isOwner).toBe(true);
      expect(useOwnerStore.getState().isOwnerLoading).toBe(false);
    });

    it("simulates ownership check flow: loading -> not owner", () => {
      act(() => {
        useOwnerStore.getState().setIsOwner(false);
        useOwnerStore.getState().setIsOwnerLoading(false);
      });

      expect(useOwnerStore.getState().isOwner).toBe(false);
      expect(useOwnerStore.getState().isOwnerLoading).toBe(false);
    });
  });
});

describe("useCommunityAdminStore", () => {
  beforeEach(() => {
    act(() => {
      useCommunityAdminStore.setState({ isCommunityAdmin: false });
    });
  });

  describe("initial state", () => {
    it("starts with isCommunityAdmin as false", () => {
      expect(useCommunityAdminStore.getState().isCommunityAdmin).toBe(false);
    });
  });

  describe("setIsCommunityAdmin", () => {
    it("sets admin status to true", () => {
      act(() => {
        useCommunityAdminStore.getState().setIsCommunityAdmin(true);
      });
      expect(useCommunityAdminStore.getState().isCommunityAdmin).toBe(true);
    });

    it("sets admin status to false", () => {
      act(() => {
        useCommunityAdminStore.getState().setIsCommunityAdmin(true);
      });
      act(() => {
        useCommunityAdminStore.getState().setIsCommunityAdmin(false);
      });
      expect(useCommunityAdminStore.getState().isCommunityAdmin).toBe(false);
    });
  });

  describe("state isolation", () => {
    it("does not affect owner store when setting community admin", () => {
      act(() => {
        useCommunityAdminStore.getState().setIsCommunityAdmin(true);
      });
      // Owner store should remain unaffected
      expect(useOwnerStore.getState().isOwner).toBe(false);
    });
  });
});
