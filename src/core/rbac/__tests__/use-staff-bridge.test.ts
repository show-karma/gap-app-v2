import { useStaff } from "../hooks/use-staff-bridge";
import { Role } from "../types/role";

// Track the mock return value so tests can change it
const mockContextValue = {
  hasRoleOrHigher: jest.fn(),
  isLoading: false,
};

jest.mock("../context/permission-context", () => ({
  usePermissionContext: () => mockContextValue,
}));

// We need renderHook to test hooks outside of a component
import { renderHook } from "@testing-library/react";

describe("useStaff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue.isLoading = false;
    mockContextValue.hasRoleOrHigher.mockReturnValue(false);
  });

  it("should return isStaff=true when user has SUPER_ADMIN role", () => {
    mockContextValue.hasRoleOrHigher.mockImplementation((role: Role) => role === Role.SUPER_ADMIN);

    const { result } = renderHook(() => useStaff());

    expect(result.current.isStaff).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(mockContextValue.hasRoleOrHigher).toHaveBeenCalledWith(Role.SUPER_ADMIN);
  });

  it("should return isStaff=false for COMMUNITY_ADMIN role", () => {
    mockContextValue.hasRoleOrHigher.mockReturnValue(false);

    const { result } = renderHook(() => useStaff());

    expect(result.current.isStaff).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("should return isStaff=false for PROGRAM_ADMIN role", () => {
    mockContextValue.hasRoleOrHigher.mockReturnValue(false);

    const { result } = renderHook(() => useStaff());

    expect(result.current.isStaff).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("should return isStaff=false for GUEST role", () => {
    mockContextValue.hasRoleOrHigher.mockReturnValue(false);

    const { result } = renderHook(() => useStaff());

    expect(result.current.isStaff).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("should return isLoading=true and isStaff=false during loading", () => {
    mockContextValue.isLoading = true;
    // Even if hasRoleOrHigher would return true, isStaff should be false during loading
    mockContextValue.hasRoleOrHigher.mockReturnValue(true);

    const { result } = renderHook(() => useStaff());

    expect(result.current.isStaff).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it("should pass SUPER_ADMIN to hasRoleOrHigher check", () => {
    renderHook(() => useStaff());

    expect(mockContextValue.hasRoleOrHigher).toHaveBeenCalledWith(Role.SUPER_ADMIN);
  });
});
