import { useState } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }[];
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      id: crypto.randomUUID()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          projectsInProgram: options.body.projectsInProgram
        })
      });

      const data = await response.json();
      
      // Filter out tool messages and only keep user/assistant messages
      const newMessages = data.history
        .filter((msg: Message) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: Omit<Message, 'id'>) => ({
          ...msg,
          id: crypto.randomUUID()
        }));

      // Keep all previous messages and add new ones
      setMessages(prev => [...prev, ...newMessages.slice(-1)]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages
  };
}