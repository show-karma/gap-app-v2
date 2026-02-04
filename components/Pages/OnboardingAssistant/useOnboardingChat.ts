import { useCallback, useRef, useState } from "react";
import type { ChatMessage, OnboardingData } from "./types";

const URL_REGEX = /https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+[/\w.-]*(?:\?[^\s]*)?/g;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

export function extractJsonFromMessage(content: string): OnboardingData | null {
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/;
  const match = content.match(jsonBlockRegex);
  if (!match?.[1]) return null;

  try {
    const parsed = JSON.parse(match[1].trim());
    if (
      parsed.type === "onboarding_data" &&
      parsed.project &&
      parsed.project.title &&
      parsed.project.description
    ) {
      return parsed as OnboardingData;
    }
  } catch {
    // Malformed JSON - ignore and keep chatting
  }
  return null;
}

export function useOnboardingChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [extractedData, setExtractedData] = useState<OnboardingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const resetConversation = useCallback(() => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setIsStreaming(false);
    setExtractedData(null);
    setError(null);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setInput("");
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Extract URLs from user input
    const urls = extractUrls(trimmedInput);

    // Prepare messages for API (only role and content)
    const messagesToSend = updatedMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/onboarding-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToSend,
          urls: urls.length > 0 ? urls : undefined,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage =
          response.status === 429
            ? "You've sent too many messages. Please wait a bit before trying again."
            : response.status === 503
              ? "The AI service is temporarily unavailable. Please try again."
              : errorBody?.error || "Something went wrong. Please try again.";
        setError(errorMessage);
        setIsLoading(false);
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("Failed to connect to AI service.");
        setIsLoading(false);
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      const assistantMessageId = crypto.randomUUID();
      let assistantContent = "";

      // Add empty assistant message that we'll update
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const sseMessages = chunk.match(/data: [^\n]*/g) || [];

        for (const sseMessage of sseMessages) {
          const data = sseMessage.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            switch (parsed.type) {
              case "content":
                if (parsed.content) {
                  assistantContent += parsed.content;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg
                    )
                  );
                }
                break;

              case "final":
                if (parsed.content) {
                  assistantContent = parsed.content;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg
                    )
                  );

                  // Try to extract structured data from final message
                  const extracted = extractJsonFromMessage(assistantContent);
                  if (extracted) {
                    setExtractedData(extracted);
                  }
                }
                break;

              case "error":
                setError(parsed.content || "An error occurred during generation.");
                break;
            }
          } catch {
            // Skip malformed SSE data
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled - not an error
        return;
      }
      setError("Failed to connect to the AI service. Please try again.");
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    isStreaming,
    extractedData,
    hasExtractedData: extractedData !== null,
    resetConversation,
    error,
    setInput,
  };
}
