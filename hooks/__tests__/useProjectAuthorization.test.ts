import { renderHook } from "@testing-library/react";
import { useProjectAuthorization } from "../useProjectAuthorization";

vi.mock("@/store", () => ({
  useOwnerStore: vi.fn(),
  useProjectStore: vi.fn(),
}));

import { useOwnerStore, useProjectStore } from "@/store";

const mockUseOwnerStore = useOwnerStore as unknown as vi.Mock;
const mockUseProjectStore = useProjectStore as unknown as vi.Mock;

function mockStores({ isOwner = false, isProjectAdmin = false, isProjectOwner = false } = {}) {
  mockUseOwnerStore.mockImplementation((selector) => selector({ isOwner }));
  mockUseProjectStore.mockImplementation((selector) =>
    selector({ isProjectAdmin, isProjectOwner })
  );
}

describe("useProjectAuthorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when the user has none of the ownership signals", () => {
    mockStores();
    const { result } = renderHook(() => useProjectAuthorization());
    expect(result.current).toBe(false);
  });

  it("returns true for the global EAS resolver super-admin (isOwner)", () => {
    mockStores({ isOwner: true });
    const { result } = renderHook(() => useProjectAuthorization());
    expect(result.current).toBe(true);
  });

  it("returns true for an on-chain project admin (isProjectAdmin)", () => {
    mockStores({ isProjectAdmin: true });
    const { result } = renderHook(() => useProjectAuthorization());
    expect(result.current).toBe(true);
  });

  it("returns true for a project owner without admin rights (isProjectOwner)", () => {
    // The regression case: email/embedded-wallet owners resolve only via isProjectOwner.
    mockStores({ isProjectOwner: true });
    const { result } = renderHook(() => useProjectAuthorization());
    expect(result.current).toBe(true);
  });
});
