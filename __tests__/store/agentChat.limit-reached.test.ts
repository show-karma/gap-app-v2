/**
 * @file Tests for the agentChat store's working-limit (`limitReached`) state.
 * Split out of agentChat.test.ts to keep each test module under the size limit.
 */

import { act } from "@testing-library/react";
import { useAgentChatStore } from "@/store/agentChat";

describe("useAgentChatStore — limitReached", () => {
  beforeEach(() => {
    act(() => {
      useAgentChatStore.setState({
        messages: [],
        isStreaming: false,
        error: null,
        limitReached: null,
      });
    });
  });

  it("defaults to null", () => {
    expect(useAgentChatStore.getState().limitReached).toBeNull();
  });

  describe("setLimitReached", () => {
    it("should set the limit reason", () => {
      act(() => {
        useAgentChatStore.getState().setLimitReached({ reason: "budget" });
      });
      expect(useAgentChatStore.getState().limitReached).toEqual({ reason: "budget" });
    });

    it("should clear the limit when set to null", () => {
      act(() => {
        useAgentChatStore.getState().setLimitReached({ reason: "turns" });
        useAgentChatStore.getState().setLimitReached(null);
      });
      expect(useAgentChatStore.getState().limitReached).toBeNull();
    });
  });

  it("clearMessages also clears limitReached", () => {
    act(() => {
      useAgentChatStore.getState().setLimitReached({ reason: "budget" });
      useAgentChatStore.getState().clearMessages();
    });
    expect(useAgentChatStore.getState().limitReached).toBeNull();
  });
});
