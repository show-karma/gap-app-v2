/**
 * @file Tests for agentChat Zustand store
 * @description Tests chat state management including messages, streaming, and context
 */

import { act } from "@testing-library/react";
import { type ChatMessage, useAgentChatStore } from "@/store/agentChat";

describe("useAgentChatStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    act(() => {
      useAgentChatStore.setState({
        messages: [],
        isOpen: false,
        isStreaming: false,
        error: null,
        agentContext: null,
      });
    });
  });

  describe("initial state", () => {
    it("should have empty messages", () => {
      expect(useAgentChatStore.getState().messages).toEqual([]);
    });

    it("should be closed by default", () => {
      expect(useAgentChatStore.getState().isOpen).toBe(false);
    });

    it("should not be streaming", () => {
      expect(useAgentChatStore.getState().isStreaming).toBe(false);
    });

    it("should have no error", () => {
      expect(useAgentChatStore.getState().error).toBeNull();
    });

    it("should have null agent context", () => {
      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });

  describe("setOpen", () => {
    it("should set isOpen to true", () => {
      act(() => {
        useAgentChatStore.getState().setOpen(true);
      });
      expect(useAgentChatStore.getState().isOpen).toBe(true);
    });

    it("should set isOpen to false", () => {
      act(() => {
        useAgentChatStore.getState().setOpen(true);
        useAgentChatStore.getState().setOpen(false);
      });
      expect(useAgentChatStore.getState().isOpen).toBe(false);
    });
  });

  describe("toggleOpen", () => {
    it("should toggle from closed to open", () => {
      act(() => {
        useAgentChatStore.getState().toggleOpen();
      });
      expect(useAgentChatStore.getState().isOpen).toBe(true);
    });

    it("should toggle from open to closed", () => {
      act(() => {
        useAgentChatStore.getState().setOpen(true);
        useAgentChatStore.getState().toggleOpen();
      });
      expect(useAgentChatStore.getState().isOpen).toBe(false);
    });
  });

  describe("addMessage", () => {
    it("should add a message to the list", () => {
      const msg: ChatMessage = {
        id: "user-1",
        role: "user",
        content: "Hello",
        timestamp: 1000,
      };

      act(() => {
        useAgentChatStore.getState().addMessage(msg);
      });

      const messages = useAgentChatStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(msg);
    });

    it("should append messages in order", () => {
      const msg1: ChatMessage = {
        id: "user-1",
        role: "user",
        content: "Hello",
        timestamp: 1000,
      };
      const msg2: ChatMessage = {
        id: "assistant-1",
        role: "assistant",
        content: "Hi there!",
        timestamp: 1001,
      };

      act(() => {
        useAgentChatStore.getState().addMessage(msg1);
        useAgentChatStore.getState().addMessage(msg2);
      });

      const messages = useAgentChatStore.getState().messages;
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe("user-1");
      expect(messages[1].id).toBe("assistant-1");
    });

    it("should support messages with toolResult", () => {
      const msg: ChatMessage = {
        id: "assistant-2",
        role: "assistant",
        content: "Preview ready",
        timestamp: 1000,
        toolResult: {
          type: "preview",
          toolName: "preview_update_project",
          data: { title: "New Title" },
        },
      };

      act(() => {
        useAgentChatStore.getState().addMessage(msg);
      });

      expect(useAgentChatStore.getState().messages[0].toolResult?.type).toBe("preview");
    });

    it("should support messages with isStreaming flag", () => {
      const msg: ChatMessage = {
        id: "assistant-3",
        role: "assistant",
        content: "",
        timestamp: 1000,
        isStreaming: true,
      };

      act(() => {
        useAgentChatStore.getState().addMessage(msg);
      });

      expect(useAgentChatStore.getState().messages[0].isStreaming).toBe(true);
    });
  });

  describe("updateLastAssistantMessage", () => {
    it("should update content of last assistant message", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "user-1",
          role: "user",
          content: "Question",
          timestamp: 1000,
        });
        useAgentChatStore.getState().addMessage({
          id: "assistant-1",
          role: "assistant",
          content: "",
          timestamp: 1001,
        });
      });

      act(() => {
        useAgentChatStore.getState().updateLastAssistantMessage("Updated content");
      });

      const messages = useAgentChatStore.getState().messages;
      expect(messages[1].content).toBe("Updated content");
    });

    it("should not update if last message is not assistant", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "user-1",
          role: "user",
          content: "Hello",
          timestamp: 1000,
        });
      });

      act(() => {
        useAgentChatStore.getState().updateLastAssistantMessage("Should not appear");
      });

      const messages = useAgentChatStore.getState().messages;
      expect(messages[0].content).toBe("Hello");
    });

    it("should handle empty messages array", () => {
      act(() => {
        useAgentChatStore.getState().updateLastAssistantMessage("No crash");
      });

      expect(useAgentChatStore.getState().messages).toHaveLength(0);
    });

    it("should preserve other message fields when updating", () => {
      const original: ChatMessage = {
        id: "assistant-1",
        role: "assistant",
        content: "",
        timestamp: 1000,
        isStreaming: true,
      };

      act(() => {
        useAgentChatStore.getState().addMessage(original);
        useAgentChatStore.getState().updateLastAssistantMessage("New content");
      });

      const msg = useAgentChatStore.getState().messages[0];
      expect(msg.id).toBe("assistant-1");
      expect(msg.timestamp).toBe(1000);
      expect(msg.isStreaming).toBe(true);
      expect(msg.content).toBe("New content");
    });
  });

  describe("updateLastAssistantToolResult", () => {
    it("should set toolResult on last assistant message", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "assistant-1",
          role: "assistant",
          content: "Here are the proposed changes",
          timestamp: 1000,
        });
      });

      act(() => {
        useAgentChatStore.getState().updateLastAssistantToolResult({
          type: "preview",
          toolName: "preview_update_project",
          data: { title: "New Title" },
          status: "pending",
        });
      });

      const msg = useAgentChatStore.getState().messages[0];
      expect(msg.toolResult).toEqual({
        type: "preview",
        toolName: "preview_update_project",
        data: { title: "New Title" },
        status: "pending",
      });
    });

    it("should not set toolResult if last message is not assistant", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "user-1",
          role: "user",
          content: "Hello",
          timestamp: 1000,
        });
      });

      act(() => {
        useAgentChatStore.getState().updateLastAssistantToolResult({
          type: "preview",
          toolName: "preview_update_project",
          data: {},
          status: "pending",
        });
      });

      expect(useAgentChatStore.getState().messages[0].toolResult).toBeUndefined();
    });

    it("should handle empty messages array", () => {
      act(() => {
        useAgentChatStore.getState().updateLastAssistantToolResult({
          type: "preview",
          toolName: "preview_update_project",
          data: {},
          status: "pending",
        });
      });

      expect(useAgentChatStore.getState().messages).toHaveLength(0);
    });

    it("should preserve other message fields", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "assistant-1",
          role: "assistant",
          content: "Preview ready",
          timestamp: 1000,
          isStreaming: false,
        });
      });

      act(() => {
        useAgentChatStore.getState().updateLastAssistantToolResult({
          type: "preview",
          toolName: "preview_create_milestone",
          data: { name: "v1.0" },
          status: "pending",
        });
      });

      const msg = useAgentChatStore.getState().messages[0];
      expect(msg.id).toBe("assistant-1");
      expect(msg.content).toBe("Preview ready");
      expect(msg.toolResult?.toolName).toBe("preview_create_milestone");
    });
  });

  describe("updateMessageToolResultStatus", () => {
    it("should update status to approved", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "assistant-1",
          role: "assistant",
          content: "Preview",
          timestamp: 1000,
          toolResult: {
            type: "preview",
            toolName: "preview_update_project",
            data: { title: "New" },
            status: "pending",
          },
        });
      });

      act(() => {
        useAgentChatStore.getState().updateMessageToolResultStatus("assistant-1", "approved");
      });

      expect(useAgentChatStore.getState().messages[0].toolResult?.status).toBe("approved");
    });

    it("should update status to denied", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "assistant-1",
          role: "assistant",
          content: "Preview",
          timestamp: 1000,
          toolResult: {
            type: "preview",
            toolName: "preview_update_project",
            data: { title: "New" },
            status: "pending",
          },
        });
      });

      act(() => {
        useAgentChatStore.getState().updateMessageToolResultStatus("assistant-1", "denied");
      });

      expect(useAgentChatStore.getState().messages[0].toolResult?.status).toBe("denied");
    });

    it("should not affect messages without toolResult", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "assistant-1",
          role: "assistant",
          content: "No tool result",
          timestamp: 1000,
        });
      });

      act(() => {
        useAgentChatStore.getState().updateMessageToolResultStatus("assistant-1", "approved");
      });

      expect(useAgentChatStore.getState().messages[0].toolResult).toBeUndefined();
    });

    it("should not affect other messages", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "assistant-1",
          role: "assistant",
          content: "First",
          timestamp: 1000,
          toolResult: {
            type: "preview",
            toolName: "preview_update_project",
            data: {},
            status: "pending",
          },
        });
        useAgentChatStore.getState().addMessage({
          id: "assistant-2",
          role: "assistant",
          content: "Second",
          timestamp: 1001,
          toolResult: {
            type: "preview",
            toolName: "preview_create_milestone",
            data: {},
            status: "pending",
          },
        });
      });

      act(() => {
        useAgentChatStore.getState().updateMessageToolResultStatus("assistant-2", "denied");
      });

      expect(useAgentChatStore.getState().messages[0].toolResult?.status).toBe("pending");
      expect(useAgentChatStore.getState().messages[1].toolResult?.status).toBe("denied");
    });

    it("should preserve other toolResult fields", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "assistant-1",
          role: "assistant",
          content: "Preview",
          timestamp: 1000,
          toolResult: {
            type: "preview",
            toolName: "preview_update_project",
            data: { title: "New Title" },
            status: "pending",
          },
        });
      });

      act(() => {
        useAgentChatStore.getState().updateMessageToolResultStatus("assistant-1", "approved");
      });

      const tr = useAgentChatStore.getState().messages[0].toolResult;
      expect(tr?.type).toBe("preview");
      expect(tr?.toolName).toBe("preview_update_project");
      expect(tr?.data).toEqual({ title: "New Title" });
      expect(tr?.status).toBe("approved");
    });
  });

  describe("setStreaming", () => {
    it("should set streaming to true", () => {
      act(() => {
        useAgentChatStore.getState().setStreaming(true);
      });
      expect(useAgentChatStore.getState().isStreaming).toBe(true);
    });

    it("should set streaming to false", () => {
      act(() => {
        useAgentChatStore.getState().setStreaming(true);
        useAgentChatStore.getState().setStreaming(false);
      });
      expect(useAgentChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      act(() => {
        useAgentChatStore.getState().setError("Something went wrong");
      });
      expect(useAgentChatStore.getState().error).toBe("Something went wrong");
    });

    it("should clear error with null", () => {
      act(() => {
        useAgentChatStore.getState().setError("Error");
        useAgentChatStore.getState().setError(null);
      });
      expect(useAgentChatStore.getState().error).toBeNull();
    });
  });

  describe("setAgentContext", () => {
    it("should set project context", () => {
      act(() => {
        useAgentChatStore.getState().setAgentContext({ projectId: "proj-1" });
      });
      expect(useAgentChatStore.getState().agentContext).toEqual({
        projectId: "proj-1",
      });
    });

    it("should set program context", () => {
      act(() => {
        useAgentChatStore.getState().setAgentContext({ programId: "prog-1" });
      });
      expect(useAgentChatStore.getState().agentContext).toEqual({
        programId: "prog-1",
      });
    });

    it("should set application context", () => {
      act(() => {
        useAgentChatStore.getState().setAgentContext({ applicationId: "app-1" });
      });
      expect(useAgentChatStore.getState().agentContext).toEqual({
        applicationId: "app-1",
      });
    });

    it("should clear context with null", () => {
      act(() => {
        useAgentChatStore.getState().setAgentContext({ projectId: "proj-1" });
        useAgentChatStore.getState().setAgentContext(null);
      });
      expect(useAgentChatStore.getState().agentContext).toBeNull();
    });
  });

  describe("clearMessages", () => {
    it("should clear all messages", () => {
      act(() => {
        useAgentChatStore.getState().addMessage({
          id: "user-1",
          role: "user",
          content: "Hello",
          timestamp: 1000,
        });
        useAgentChatStore.getState().addMessage({
          id: "assistant-1",
          role: "assistant",
          content: "Hi",
          timestamp: 1001,
        });
      });

      act(() => {
        useAgentChatStore.getState().clearMessages();
      });

      expect(useAgentChatStore.getState().messages).toEqual([]);
    });

    it("should also clear error", () => {
      act(() => {
        useAgentChatStore.getState().setError("Some error");
        useAgentChatStore.getState().clearMessages();
      });

      expect(useAgentChatStore.getState().error).toBeNull();
    });

    it("should not affect isOpen state", () => {
      act(() => {
        useAgentChatStore.getState().setOpen(true);
        useAgentChatStore.getState().clearMessages();
      });

      expect(useAgentChatStore.getState().isOpen).toBe(true);
    });
  });
});
