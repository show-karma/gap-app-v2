"use client";

import { useState, useCallback, useRef, FormEvent, ChangeEvent } from "react";
import { envVars } from "@/utilities/enviromentVars";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  timestamp?: string;
  sender?: string;
}

interface UseChatOptions {
  body?: {
    projects?: any[];
    projectsInProgram?: Array<{ uid: string; projectTitle: string }>;
    programId?: string;
    chainId?: string;
    communityId?: string;
  };
  api?: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent) => void;
  setInput: (input: string | ((prev: string) => string)) => void;
  isLoading: boolean;
  isStreaming: boolean;
  error?: Error;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      
      if (!input.trim() || isLoading) {
        return;
      }

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: input.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setIsStreaming(true);
      setError(undefined);

      try {
        // Cancel any ongoing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        const apiEndpoint = options.api || '/api/chat';
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            ...options.body,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;

          if (value) {
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  done = true;
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  
                  if (content) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessage.id
                          ? { ...msg, content: msg.content + content }
                          : msg
                      )
                    );
                  }
                } catch (parseError) {
                  // Handle non-JSON chunks or append as text
                  if (data.trim()) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessage.id
                          ? { ...msg, content: msg.content + data }
                          : msg
                      )
                    );
                  }
                }
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // Request was cancelled
        }

        console.error('Chat error:', err);
        setError(err);
        
        // Add error message
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "Sorry, I encountered an error while processing your request. Please try again.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [input, isLoading, messages, options.api, options.body]
  );

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setInput,
    isLoading,
    isStreaming,
    error,
  };
}