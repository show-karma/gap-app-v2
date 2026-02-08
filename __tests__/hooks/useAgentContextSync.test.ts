/**
 * @file Tests for useAgentContextSync hook
 * @description Tests route-based agent context synchronization for
 * project, program, and application pages.
 */

import { renderHook } from "@testing-library/react";
import { useAgentContextSync } from "@/hooks/useAgentContextSync";
import { useAgentChatStore } from "@/store/agentChat";

// Mock next/navigation
const mockPathname = jest.fn<string | null, []>();
const mockParams = jest.fn<Record<string, string>, []>();

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useParams: () => mockParams(),
}));

const mockUsePermissions = jest.fn(() => ({
  hasPermission: true,
  isLoading: false,
}));

jest.mock("@/hooks/usePermissions", () => ({
  usePermissions: (...args: any[]) => mockUsePermissions(...args),
}));

describe("useAgentContextSync", () => {
  beforeEach(() => {
    useAgentChatStore.setState({
      agentContext: null,
    });
    mockPathname.mockReturnValue(null);
    mockParams.mockReturnValue({});
    mockUsePermissions.mockReset();
    mockUsePermissions.mockReturnValue({
      hasPermission: true,
      isLoading: false,
    });
  });

  describe("project pages", () => {
    it("should set projectId context on project page", () => {
      mockPathname.mockReturnValue("/project/my-project");
      mockParams.mockReturnValue({ projectId: "proj-123" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        projectId: "proj-123",
      });
    });

    it("should set context on project subpages", () => {
      mockPathname.mockReturnValue("/project/my-project/about");
      mockParams.mockReturnValue({ projectId: "proj-456" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        projectId: "proj-456",
      });
    });

    it("should not set context if projectId param is missing", () => {
      mockPathname.mockReturnValue("/project/");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });

  describe("program admin pages", () => {
    it("should set programId context on admin funding platform page", () => {
      mockPathname.mockReturnValue(
        "/community/comm-1/admin/funding-platform/prog-abc/applications"
      );
      mockParams.mockReturnValue({
        communityId: "comm-1",
        programId: "prog-abc",
      });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        programId: "prog-abc",
        communityId: "comm-1",
      });
    });

    it("should strip chainId suffix from programId", () => {
      mockPathname.mockReturnValue(
        "/community/comm-1/admin/funding-platform/prog-abc_42161/applications"
      );
      mockParams.mockReturnValue({
        communityId: "comm-1",
        programId: "prog-abc_42161",
      });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        programId: "prog-abc",
        communityId: "comm-1",
      });
    });

    it("should not set context without communityId", () => {
      mockPathname.mockReturnValue("/community//admin/funding-platform/prog-abc/applications");
      mockParams.mockReturnValue({ programId: "prog-abc" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });

    it("should set community context without programId", () => {
      mockPathname.mockReturnValue("/community/comm-1/admin/funding-platform/");
      mockParams.mockReturnValue({ communityId: "comm-1" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        communityId: "comm-1",
      });
    });

    it("should clear context when permission is denied", () => {
      mockPathname.mockReturnValue(
        "/community/comm-1/admin/funding-platform/prog-abc/applications"
      );
      mockParams.mockReturnValue({
        communityId: "comm-1",
        programId: "prog-abc",
      });
      mockUsePermissions
        .mockReturnValueOnce({ hasPermission: false, isLoading: false })
        .mockReturnValueOnce({ hasPermission: true, isLoading: false });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });

  describe("reviewer pages", () => {
    it("should set applicationId context on reviewer page", () => {
      mockPathname.mockReturnValue(
        "/community/comm-1/reviewer/funding-platform/prog-abc/applications/app-789"
      );
      mockParams.mockReturnValue({ applicationId: "app-789" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        applicationId: "app-789",
      });
    });

    it("should not set context without applicationId on reviewer page", () => {
      mockPathname.mockReturnValue(
        "/community/comm-1/reviewer/funding-platform/prog-abc/applications"
      );
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });

    it("should clear context when reviewer permission is denied", () => {
      mockPathname.mockReturnValue(
        "/community/comm-1/reviewer/funding-platform/prog-abc/applications/app-789"
      );
      mockParams.mockReturnValue({
        programId: "prog-abc",
        applicationId: "app-789",
      });
      mockUsePermissions
        .mockReturnValueOnce({ hasPermission: true, isLoading: false })
        .mockReturnValueOnce({ hasPermission: false, isLoading: false });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });

  describe("non-context pages", () => {
    it("should clear context on homepage", () => {
      // Pre-set context
      useAgentChatStore.setState({
        agentContext: { projectId: "proj-old" },
      });

      mockPathname.mockReturnValue("/");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });

    it("should clear context on settings page", () => {
      useAgentChatStore.setState({
        agentContext: { programId: "prog-old" },
      });

      mockPathname.mockReturnValue("/settings");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });

    it("should clear context on community page without admin path", () => {
      useAgentChatStore.setState({
        agentContext: { programId: "prog-old" },
      });

      mockPathname.mockReturnValue("/community/comm-1");
      mockParams.mockReturnValue({ communityId: "comm-1" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });

  describe("context updates on navigation", () => {
    it("should update context when navigating between project pages", () => {
      mockPathname.mockReturnValue("/project/proj-a");
      mockParams.mockReturnValue({ projectId: "proj-a" });

      const { rerender } = renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        projectId: "proj-a",
      });

      // Navigate to different project
      mockPathname.mockReturnValue("/project/proj-b");
      mockParams.mockReturnValue({ projectId: "proj-b" });

      rerender();

      expect(useAgentChatStore.getState().agentContext).toEqual({
        projectId: "proj-b",
      });
    });

    it("should clear context when navigating from project to home", () => {
      mockPathname.mockReturnValue("/project/my-project");
      mockParams.mockReturnValue({ projectId: "proj-123" });

      const { rerender } = renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        projectId: "proj-123",
      });

      // Navigate to home
      mockPathname.mockReturnValue("/");
      mockParams.mockReturnValue({});

      rerender();

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });
});
