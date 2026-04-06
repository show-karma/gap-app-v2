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
const mockWhitelabel = vi.fn<() => { communitySlug: string | null }>();

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => mockWhitelabel(),
}));

describe("useAgentContextSync", () => {
  beforeEach(() => {
    useAgentChatStore.setState({
      agentContext: null,
    });
    mockPathname.mockReturnValue(null);
    mockParams.mockReturnValue({});
    mockWhitelabel.mockReturnValue({ communitySlug: null });
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
    it("should clear context on homepage when not whitelabel", () => {
      useAgentChatStore.setState({
        agentContext: { projectId: "proj-old" },
      });

      mockPathname.mockReturnValue("/");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });

    it("should clear context on settings page when not whitelabel", () => {
      useAgentChatStore.setState({
        agentContext: { programId: "prog-old" },
      });

      mockPathname.mockReturnValue("/settings");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });

    it("should clear context on community page without manage path", () => {
      useAgentChatStore.setState({
        agentContext: { programId: "prog-old" },
      });

      mockPathname.mockReturnValue("/community/comm-1");
      mockParams.mockReturnValue({ communityId: "comm-1" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });

  describe("whitelabel community fallback", () => {
    it("should use whitelabel communitySlug on non-context pages", () => {
      mockWhitelabel.mockReturnValue({ communitySlug: "filecoin" });
      mockPathname.mockReturnValue("/");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        communityId: "filecoin",
      });
    });

    it("should use whitelabel communitySlug on funding-map page", () => {
      mockWhitelabel.mockReturnValue({ communitySlug: "filecoin" });
      mockPathname.mockReturnValue("/funding-map");
      mockParams.mockReturnValue({});

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        communityId: "filecoin",
      });
    });

    it("should prefer URL communityId over whitelabel fallback", () => {
      mockWhitelabel.mockReturnValue({ communitySlug: "filecoin" });
      mockPathname.mockReturnValue("/community/arbitrum/manage/");
      mockParams.mockReturnValue({ communityId: "arbitrum" });

      renderHook(() => useAgentContextSync());

      expect(useAgentChatStore.getState().agentContext).toEqual({
        communityId: "arbitrum",
      });
    });

    it("should use whitelabel fallback on project pages alongside projectId", () => {
      mockWhitelabel.mockReturnValue({ communitySlug: "filecoin" });
      mockPathname.mockReturnValue("/project/my-project");
      mockParams.mockReturnValue({ projectId: "proj-123" });

      renderHook(() => useAgentContextSync());

      // Project context takes priority — projectId is the primary context
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
