import { useState } from "react";
import { envVars } from "@/utilities/enviromentVars";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface UseChatOptions {
  body: {
    projectsInProgram: {
      uid: string;
      projectTitle: string;
    }[];
  };
}

export function useChat(options: UseChatOptions) {
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setInput("");
    setIsLoading(true);
    setIsStreaming(true);

    const userMessage: Message = {
      role: "user",
      content: input,
      id: crypto.randomUUID(),
    };

    // Scroll helper function
    const scrollToBottom = () => {
      const chatContainer = document.querySelector("[data-chat-container]");
      chatContainer?.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: "smooth",
      });
    };

    // Add user message and scroll
    setAllMessages((prev) => {
      setTimeout(scrollToBottom, 0);
      return [...prev, userMessage];
    });

    // Set up interval for scrolling during streaming
    const scrollInterval = setInterval(scrollToBottom, 1000);

    // Filter out system messages
    const messagesToSend = allMessages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map(({ role, content }) => ({ role, content }));

    try {
      const response = await fetch(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/karma-beacon`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...messagesToSend,
              { role: userMessage.role, content: userMessage.content },
            ],
            projectsInProgram: options.body.projectsInProgram,
          }),
        }
      );

      if (!response.ok) throw new Error("Stream response not ok");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let currentLoopMessages = new Map<string, Message>();
      let accumulatedContent = new Map<string, string>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const messages = chunk.match(/data: [^\n]*/g) || [];

        for (const message of messages) {
          if (message.trim().startsWith("data: ")) {
            const data = message.slice(5).trim();
            if (data === "[DONE]") {
              console.log("Stream completed");
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const loopId = parsed.loopId;

              if (!loopId) {
                console.warn("Received message without loopId:", data);
                continue;
              }

              if (!accumulatedContent.has(loopId)) {
                accumulatedContent.set(loopId, "");
              }

              if (!currentLoopMessages.has(loopId)) {
                const newMessage = {
                  role: "assistant" as const,
                  content: "",
                  id: crypto.randomUUID(),
                };
                currentLoopMessages.set(loopId, newMessage);
                setAllMessages((prev) => [...prev, newMessage as Message]);
              }

              const currentLoopMessage = currentLoopMessages.get(loopId)!;

              if (parsed.type === "content" && parsed.content?.trim()) {
                accumulatedContent.set(
                  loopId,
                  accumulatedContent.get(loopId)! + parsed.content
                );

                currentLoopMessage.content = accumulatedContent.get(loopId)!;

                setAllMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentLoopMessage.id
                      ? { ...msg, content: accumulatedContent.get(loopId)! }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Error parsing message:", e);
            }
          }
        }
      }

      setCurrentMessage("");
    } catch (error) {
      console.error("Error in stream processing:", error);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      clearInterval(scrollInterval); // Clean up interval
      setTimeout(scrollToBottom, 100); // Final scroll after streaming ends
    }
  };

  return {
    messages: allMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages: setAllMessages,
    currentMessage,
    isStreaming,
  };
}
