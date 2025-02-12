import { useState } from "react";
import { envVars } from "@/utilities/enviromentVars";
import { useAccount } from "wagmi";

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }[];
  sender?: string;
  timestamp?: string;
}

interface UseChatOptions {
  body: {
    projectsInProgram: Array<{
      uid: string;
      chainId: number;
      projectTitle: string;
      projectCategories: string[];
    }>;
  };
}

export function useChat(options: UseChatOptions) {
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const { address } = useAccount();

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
      sender: address,
      timestamp: new Date().toISOString(),
    };

    // Filter out tool-related messages
    const messagesToSend = allMessages
      .filter(
        (msg) =>
          (msg.role === "user" || msg.role === "assistant") && !msg.tool_calls
      )
      .map(({ role, content }) => ({ role, content }));

    setAllMessages((prev) => [...prev, userMessage]);

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
      let currentLoopMessages = new Map<string, Partial<Message>>();

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

              if (!currentLoopMessages.has(loopId)) {
                const newMessage = {
                  role: "assistant" as const,
                  content: "",
                  id: crypto.randomUUID(),
                  timestamp: new Date().toISOString(),
                };
                currentLoopMessages.set(loopId, newMessage);
                setAllMessages((prev) => [...prev, newMessage as Message]);
              }

              const currentLoopMessage = currentLoopMessages.get(loopId)!;

              switch (parsed.type) {
                case "content":
                  if (parsed.content.trim()) {
                    currentLoopMessage.content =
                      (currentLoopMessage.content || "") + parsed.content;
                    setAllMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === currentLoopMessage.id
                          ? {
                              ...msg,
                              content: currentLoopMessage.content || "",
                              timestamp: new Date().toISOString(),
                            }
                          : msg
                      )
                    );
                    setCurrentMessage((prev) => prev + parsed.content);
                  }
                  break;

                case "tool":
                  if (parsed.content && parsed.tool_call_id) {
                    const toolMessage: Message = {
                      role: "tool",
                      content: parsed.content,
                      id: crypto.randomUUID(),
                      tool_call_id: parsed.tool_call_id,
                      timestamp: new Date().toISOString(),
                    };
                    setAllMessages((prev) => [...prev, toolMessage]);
                  }
                  break;

                case "tool_call":
                  if (parsed.tool_calls?.length > 0) {
                    currentLoopMessage.tool_calls = parsed.tool_calls;
                    setAllMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === currentLoopMessage.id
                          ? {
                              ...msg,
                              tool_calls: parsed.tool_calls,
                              timestamp: new Date().toISOString(),
                            }
                          : msg
                      )
                    );
                  }
                  break;
              }
            } catch (e) {
              console.error("Error parsing chunk:", e, "Data:", data);
            }
          }
        }
      }

      setCurrentMessage("");
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
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
