import { renderHook } from "@testing-library/react";
import { useCanVerifyMilestone } from "@/hooks/useCanVerifyMilestone";
import { useAuth } from "@/hooks/useAuth";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useIsReviewer } from "@/hooks/usePermissions";
import { useOwnerStore, useProjectStore } from "@/store";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: jest.fn(),
}));

jest.mock("@/hooks/usePermissions", () => ({
  useIsReviewer: jest.fn(),
}));

jest.mock("@/store", () => ({
  useOwnerStore: jest.fn(),
  useProjectStore: jest.fn(),
}));

const mockUseAuth = useAuth as unknown as jest.Mock;
const mockUseIsCommunityAdmin = useIsCommunityAdmin as unknown as jest.Mock;
const mockUseIsReviewer = useIsReviewer as unknown as jest.Mock;
const mockUseOwnerStore = useOwnerStore as unknown as jest.Mock;
const mockUseProjectStore = useProjectStore as unknown as jest.Mock;

function setupMocks(overrides: {
  authenticated?: boolean;
  isOwner?: boolean;
  isProjectAdmin?: boolean;
  isProjectOwner?: boolean;
  isCommunityAdmin?: boolean;
  isReviewer?: boolean;
} = {}) {
  const {
    authenticated = true,
    isOwner = false,
    isProjectAdmin = false,
    isProjectOwner = false,
    isCommunityAdmin = false,
    isReviewer = false,
  } = overrides;

  mockUseAuth.mockReturnValue({ authenticated });
  mockUseOwnerStore.mockImplementation((selector: (s: any) => any) =>
    selector({ isOwner })
  );
  mockUseProjectStore.mockImplementation((selector: (s: any) => any) =>
    selector({ isProjectAdmin, isProjectOwner })
  );
  mockUseIsCommunityAdmin.mockReturnValue({ isCommunityAdmin });
  mockUseIsReviewer.mockReturnValue({ isReviewer });
}

describe("useCanVerifyMilestone", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows contract owner to verify", () => {
    setupMocks({ isOwner: true });
    const { result } = renderHook(() => useCanVerifyMilestone("prog1", "comm1"));
    expect(result.current.canVerify).toBe(true);
  });

  it("allows community admin to verify", () => {
    setupMocks({ isCommunityAdmin: true });
    const { result } = renderHook(() => useCanVerifyMilestone("prog1", "comm1"));
    expect(result.current.canVerify).toBe(true);
  });

  it("allows program reviewer to verify", () => {
    setupMocks({ isReviewer: true });
    const { result } = renderHook(() => useCanVerifyMilestone("prog1", "comm1"));
    expect(result.current.canVerify).toBe(true);
  });

  it("blocks project owner from verifying", () => {
    setupMocks({ isProjectOwner: true, isCommunityAdmin: true });
    const { result } = renderHook(() => useCanVerifyMilestone("prog1", "comm1"));
    expect(result.current.canVerify).toBe(false);
  });

  it("blocks project admin from verifying", () => {
    setupMocks({ isProjectAdmin: true, isReviewer: true });
    const { result } = renderHook(() => useCanVerifyMilestone("prog1", "comm1"));
    expect(result.current.canVerify).toBe(false);
  });

  it("blocks unauthenticated users", () => {
    setupMocks({ authenticated: false, isOwner: true });
    const { result } = renderHook(() => useCanVerifyMilestone("prog1", "comm1"));
    expect(result.current.canVerify).toBe(false);
  });

  it("blocks authenticated users with no special role", () => {
    setupMocks({});
    const { result } = renderHook(() => useCanVerifyMilestone("prog1", "comm1"));
    expect(result.current.canVerify).toBe(false);
  });

  it("passes programId to useIsReviewer", () => {
    setupMocks({});
    renderHook(() => useCanVerifyMilestone("my-program", "my-community"));
    expect(mockUseIsReviewer).toHaveBeenCalledWith("my-program");
  });

  it("passes communityUID to useIsCommunityAdmin", () => {
    setupMocks({});
    renderHook(() => useCanVerifyMilestone("my-program", "my-community"));
    expect(mockUseIsCommunityAdmin).toHaveBeenCalledWith("my-community");
  });

  it("works without programId or communityUID", () => {
    setupMocks({ isOwner: true });
    const { result } = renderHook(() => useCanVerifyMilestone());
    expect(result.current.canVerify).toBe(true);
    expect(mockUseIsReviewer).toHaveBeenCalledWith(undefined);
    expect(mockUseIsCommunityAdmin).toHaveBeenCalledWith(undefined);
  });

  it("returns role flags for consumers", () => {
    setupMocks({ isCommunityAdmin: true, isOwner: true });
    const { result } = renderHook(() => useCanVerifyMilestone("prog1", "comm1"));
    expect(result.current.isCommunityAdmin).toBe(true);
    expect(result.current.isContractOwner).toBe(true);
    expect(result.current.isReviewer).toBe(false);
  });
});
