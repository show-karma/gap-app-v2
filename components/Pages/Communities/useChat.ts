import { useState } from "react";
import { envVars } from "@/utilities/enviromentVars";
import { nanoid } from "nanoid";

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
    communityId: string;
  };
}

export function useChat(options: UseChatOptions) {
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setResponseTime(null);
    const startTime = Date.now();
    const userMessage: Message = { id: nanoid(), role: "user" as const, content: input };
    setAllMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);

    // Scroll after user message
    const scrollToBottom = () => {
      const chatContainer = document.querySelector("[data-chat-container]");
      chatContainer?.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: "smooth",
      });
    };
    
    scrollToBottom(); // Immediate scroll after user message
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
            communityId: options.body.communityId,
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
            if (data === "[ERROR]") {
              console.error("Stream error received:", data);
              setAllMessages(prev => [
                ...prev,
                {
                  id: nanoid(),
                  role: "assistant",
                  content: "Sorry, an error occurred while processing your request. Please try again."
                }
              ]);
              break;
            }

            try {
              console.log("Received data:", data);
              const parsed = JSON.parse(data);
              
              // Handle error type messages from backend
              if (parsed.type === 'error') {
                console.error("Error from backend:", {
                  type: parsed.type,
                  content: parsed.content,
                  fullData: parsed
                });
                setAllMessages(prev => [
                  ...prev,
                  {
                    id: nanoid(),
                    role: "assistant",
                    content: `Sorry, an error occurred: ${parsed.content}`
                  }
                ]);
                break;
              }
              
              const loopId = parsed.loopId;

              if (!loopId) {
                console.warn("Received message without loopId:", data);
                continue;
              }

              if (parsed.type === 'final') {
                // Handle final content
                const currentLoopMessage = currentLoopMessages.get(loopId)!;
                currentLoopMessage.content = parsed.content;
                setAllMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentLoopMessage.id
                      ? { ...msg, content: parsed.content }
                      : msg
                  )
                );
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
      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      setIsLoading(false);
      setIsStreaming(false);
      clearInterval(scrollInterval);
      setTimeout(scrollToBottom, 100);
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
    responseTime,
  };
}
