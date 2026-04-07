/**
 * @file Tests for useAgentContextSync hook
 * @description Tests route-based agent context synchronization for
 * project, program, and application pages using unified /manage/ routes.
 */

import { renderHook } from "@testing-library/react";
import { useAgentContextSync } from "@/hooks/useAgentContextSync";
import { useAgentChatStore } from "@/store/agentChat";

// Mock next/navigation
const mockPathname = vi.fn<() => string | null>();
const mockParams = vi.fn<() => Record<string, string>>();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useParams: () => mockParams(),
}));

// Mock whitelabel context
const mockUseWhitelabel = vi.fn<() => { isWhitelabel: boolean; communitySlug: string | null }>();

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => mockUseWhitelabel(),
}));

describe("useAgentContextSync", () => {
  beforeEach(() => {
    useAgentChatStore.setState({
      agentContext: null,
    });
    mockPathname.mockReturnValue(null);
    mockParams.mockReturnValue({});
    mockUseWhitelabel.mockReturnValue({ isWhitelabel: false, communitySlug: null });
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

  describe("manage pages (unified admin + reviewer)", () => {
    it("should set programId context on manage funding platform page", () => {
      mockPathname.mockReturnValue(
        "/community/comm-1/manage/funding-platform/prog-abc/applications"
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
        "/community/comm-1/manage/funding-platform/prog-abc_42161/applications"
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
      mockPathname.mockReturnValue("/community//manage/funding-platform/prog-abc/applications");
      mockParams.mockReturnValue({ programId: "prog-abc" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });

    it("should set community context without programId", () => {
      mockPathname.mockReturnValue("/community/comm-1/manage/");
      mockParams.mockReturnValue({ communityId: "comm-1" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        communityId: "comm-1",
      });
    });

    it("should set applicationId context on application page", () => {
      mockPathname.mockReturnValue(
        "/community/comm-1/manage/funding-platform/prog-abc/applications/app-789"
      );
      mockParams.mockReturnValue({
        communityId: "comm-1",
        programId: "prog-abc",
        applicationId: "app-789",
      });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        applicationId: "app-789",
      });
    });

    it("should set programId when no applicationId on applications list", () => {
      mockPathname.mockReturnValue(
        "/community/comm-1/manage/funding-platform/prog-abc/applications"
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
  });

  describe("non-context pages", () => {
    it("should clear context on homepage", () => {
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

    it("should clear context on unrecognized page without communityId or projectId", () => {
      useAgentChatStore.setState({
        agentContext: { programId: "prog-old" },
      });

      mockPathname.mockReturnValue("/settings");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });

  describe("community pages (regular routes)", () => {
    it("should set communityId context on community root page", () => {
      mockPathname.mockReturnValue("/community/optimism");
      mockParams.mockReturnValue({ communityId: "optimism" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        communityId: "optimism",
      });
    });

    it("should set communityId context on community funding-opportunities subpage", () => {
      mockPathname.mockReturnValue("/community/optimism/funding-opportunities");
      mockParams.mockReturnValue({ communityId: "optimism" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        communityId: "optimism",
      });
    });

    it("should not set community context if communityId param is missing", () => {
      mockPathname.mockReturnValue("/community/");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });

  describe("whitelabel domains", () => {
    it("should set communityId from whitelabel communitySlug on any path", () => {
      mockUseWhitelabel.mockReturnValue({ isWhitelabel: true, communitySlug: "optimism" });
      mockPathname.mockReturnValue("/funding-opportunities");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        communityId: "optimism",
      });
    });

    it("should set communityId from whitelabel on root path", () => {
      mockUseWhitelabel.mockReturnValue({ isWhitelabel: true, communitySlug: "gitcoin" });
      mockPathname.mockReturnValue("/");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        communityId: "gitcoin",
      });
    });

    it("should not set community context if isWhitelabel is true but communitySlug is null", () => {
      mockUseWhitelabel.mockReturnValue({ isWhitelabel: true, communitySlug: null });
      mockPathname.mockReturnValue("/funding-opportunities");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });

    it("should prefer project context over whitelabel community on project page", () => {
      mockUseWhitelabel.mockReturnValue({ isWhitelabel: true, communitySlug: "optimism" });
      mockPathname.mockReturnValue("/project/my-project");
      mockParams.mockReturnValue({ projectId: "proj-123" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        projectId: "proj-123",
      });
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
