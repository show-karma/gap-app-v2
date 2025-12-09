"use client";

import { ShareIcon } from "@heroicons/react/24/outline";
import {
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import pluralize from "pluralize";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { PROJECT_NAME } from "@/constants/brand";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import fetchData from "@/utilities/fetchData";
import { formatDate } from "@/utilities/formatDate";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { SearchDropdown } from "../ProgramRegistry/SearchDropdown";
import { useChat } from "./useChat";

const sanitizeMarkdown = (text: string) => {
  return (
    text
      // Remove headers
      .replace(/#{1,6}\s/g, "")
      // Remove bold/italic
      .replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, "$1")
      // Remove links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove blockquotes
      .replace(/^\s*>\s+/gm, "")
      // Remove lists
      .replace(/^[\s-]*[-+*]\s+/gm, "")
      // Remove numbered lists
      .replace(/^\s*\d+\.\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[\s-]*[-*_]{3,}[\s-]*$/gm, "")
      // Remove images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove extra whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
};

interface Program {
  programId: string;
  name: string;
  chainID: string;
}

interface ProjectMilestone {
  description: string;
  title: string;
  endsAt: string;
  startsAt: string;
  status: {
    approved: boolean;
    completed: boolean;
    rejected: boolean;
  };
}

interface ProjectProgram {
  programId: string;
  name: string;
  description: string;
}

interface ProjectUpdate {
  title: string;
  text: string;
  type: string;
}

interface ProjectDetails {
  uid: string;
  data: {
    title: string;
    description?: string;
    problem: string;
    missionSummary: string;
    locationOfImpact: string;
    imageURL: string;
    links: any; // Define specific type if known
    slug: string;
    tags: string[];
    businessModel: string;
    stageInLife: string;
    raisedMoney: string;
    createdAt: string;
  };
}

interface ProjectInProgram {
  projectUID: string;
  grantUID: string;
  milestone_count: number;
  milestones: ProjectMilestone[];
  program: ProjectProgram[];
  updates: ProjectUpdate[];
  projectDetails: ProjectDetails;
  project_categories: string[];
  impacts: any; // Define specific type if known
  external: any; // Define specific type if known
}

// Update the Project interface to use the new type
export type Project = ProjectInProgram;

const cardColors = [
  "#5FE9D0",
  "#875BF7",
  "#F97066",
  "#FDB022",
  "#A6EF67",
  "#84ADFF",
  "#EF6820",
  "#EE46BC",
  "#EEAAFD",
  "#67E3F9",
] as const;

function MessageSkeleton() {
  return (
    <div className="flex flex-col justify-start">
      <div className="w-52 justify-center items-center rounded-lg p-3 py-5 bg-[#EEF4FF]">
        <div className="flex justify-center items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
        </div>
      </div>
      <div className="flex flex-row justify-between w-full mt-2 gap-4">
        <div className="flex flex-row justify-center items-center gap-3">
          <Image
            src="/logo/logo-dark.png"
            width={20}
            height={20}
            alt="Karma AI Logo"
            quality={50}
          />
          <p className="text-zinc-600 dark:text-zinc-300 text-[13px] font-medium">
            Karma AI Assistant
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoadingChat,
  placeholder = "Ask anything about the projects in this program",
  className = "",
  isLoadingProjects = false,
}: {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoadingChat: boolean;
  placeholder?: string;
  className?: string;
  isLoadingProjects?: boolean;
}) {
  return (
    <form
      onSubmit={handleSubmit}
      className={`relative w-full ${className}`}
      aria-label="Chat with Karma AI"
    >
      <input
        type="search"
        className="w-full p-4 pr-12 text-black dark:text-zinc-200 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-600 shadow-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        value={input}
        placeholder={isLoadingProjects ? "Loading projects..." : placeholder}
        onChange={handleInputChange}
        disabled={isLoadingChat || isLoadingProjects}
        aria-label="Chat input"
        aria-disabled={isLoadingChat || isLoadingProjects}
      />
      <button
        type="submit"
        disabled={isLoadingChat || isLoadingProjects || !input.trim()}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-brand-blue disabled:text-gray-500 disabled:hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        <PaperAirplaneIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  );
}

function SuggestionsBlock({
  projects,
  selectedProgram,
  onClose,
  chatHook,
  isLoadingProjects,
}: {
  projects: Project[];
  selectedProgram: Program;
  onClose: () => void;
  chatHook: ReturnType<typeof useChat>;
  isLoadingProjects: boolean;
}) {
  const { input, handleInputChange, handleSubmit, isLoading: isLoadingChat } = chatHook;
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClose = () => {
    // Remove programId from URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("programId");
    router.push(
      `${window.location.pathname}${
        newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""
      }`
    );

    onClose();
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoadingProjects) return;

    const fakeEvent = {
      target: { value: suggestion },
      preventDefault: () => {},
    };
    handleInputChange(fakeEvent as any);
    setTimeout(() => {
      handleSubmit(new Event("submit") as any);
    }, 0);
  };

  const suggestions = [
    {
      title: "Compare Projects",
      description: "Analyze multiple projects side by side with key metrics",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      query:
        "Can you compare all the projects in this program and highlight their key differences?",
    },
    {
      title: "Performance Analytics",
      description: "Track project metrics and measure impact",
      bgColor: "bg-purple-50",
      hoverColor: "hover:bg-purple-100",
      query: "Can you analyze the performance metrics and impact of these projects?",
    },
    {
      title: "Milestone Tracking",
      description: "Monitor a project's performance",
      bgColor: "bg-teal-50",
      hoverColor: "hover:bg-teal-100",
      query: "Can you show me the milestone progress for all projects?",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto w-full border border-gray-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200 dark:border-zinc-600">
        <div className="flex items-center gap-4">
          <Image src="/logo/logo-dark.png" width={32} height={32} alt={`${PROJECT_NAME} Logo`} />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedProgram.name}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:bg-transparent rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Suggestions */}
      <div className="p-6">
        <div className="grid grid-cols-3 max-md:grid-cols-1 gap-4">
          {suggestions.map((suggestion, index) => (
            <button
              type="button"
              key={index}
              onClick={() => handleSuggestionClick(suggestion.query)}
              className={cn(
                "bg-[#EEF4FF] dark:bg-gray-700 rounded-lg p-4 transition-colors flex flex-col items-start text-left w-full",
                isLoadingProjects
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:opacity-90"
              )}
              disabled={isLoadingProjects}
              aria-label={suggestion.title}
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {suggestion.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400">{suggestion.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Footer with input */}
      <div className="border-t border-gray-200 dark:border-zinc-600 p-4">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoadingChat={isLoadingChat}
          isLoadingProjects={isLoadingProjects}
        />
      </div>
      {isLoadingProjects && (
        <div className="px-4 pb-4">
          <p className="text-sm text-center text-gray-600 dark:text-zinc-400">
            Loading projects... Please wait.
          </p>
        </div>
      )}
    </div>
  );
}

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant" | "tool" | "system";
    content: string;
    timestamp?: string;
    sender?: string;
  };
  isLastAssistantMessage: boolean;
  isLastUserMessage: boolean;
  isLastInSequence: boolean;
}

const ChatMessage = React.memo(
  ({
    message: m,
    isLastAssistantMessage,
    isLastUserMessage,
    isLastInSequence,
  }: ChatMessageProps) => {
    return (
      <div
        className={`flex flex-col w-full ${m.role === "assistant" ? "items-start" : "items-end"}`}
      >
        <div
          className={cn(
            "flex w-full max-w-[80%] max-lg:max-w-[95%] flex-col",
            m.role === "assistant" ? "items-start" : "items-end"
          )}
        >
          <div className="w-max max-w-full flex-col flex">
            <div
              className={` p-3  rounded-xl ${
                m.role === "assistant" ? "bg-[#EEF4FF] text-gray-900 " : "bg-indigo-500 text-white"
              }`}
              style={{
                borderBottomLeftRadius: m.role === "assistant" ? "0px" : "8px",
                borderBottomRightRadius: m.role === "assistant" ? "8px" : "0px",
              }}
            >
              {m.content ? (
                <MarkdownPreview
                  source={m.content}
                  style={{
                    color: m.role === "assistant" ? "black" : "white",
                    fontWeight: 400,
                    fontSize: "16px",
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-md text-base font-normal">
                  {`Analyzing projects and gathering insights...`}
                </div>
              )}
            </div>
            {m.role === "assistant" && isLastInSequence ? (
              <div className="flex flex-row justify-between w-full mt-2 gap-4">
                <div className="flex flex-row justify-center items-center gap-3">
                  {isLastAssistantMessage && (
                    <>
                      <Image
                        src="/logo/logo-dark.png"
                        width={20}
                        height={20}
                        alt="Karma AI Logo"
                        quality={50}
                      />
                      <p className="text-zinc-600 dark:text-zinc-300 text-[13px] font-medium">
                        Karma AI Assistant
                      </p>
                    </>
                  )}
                </div>
                {m?.timestamp && (
                  <p className="text-zinc-400 dark:text-zinc-500 text-[13px] font-medium">
                    {formatDate(m.timestamp, "local", "h:mm a")}
                  </p>
                )}
              </div>
            ) : null}
            {m.role === "user" && isLastInSequence ? (
              <div className="flex flex-row justify-between w-full mt-2 gap-4">
                <div className="flex flex-row justify-between w-full items-center gap-3">
                  {m?.timestamp && (
                    <p className="text-zinc-400 dark:text-zinc-500 text-[13px] font-medium">
                      {formatDate(m.timestamp, "local", "h:mm a")}
                    </p>
                  )}
                  {isLastUserMessage && m?.sender ? (
                    <EthereumAddressToENSAvatar address={m.sender} />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";

const DateSeparator = ({ firstMessageDate }: { firstMessageDate: Date }) => {
  const formattedDate = formatDate(firstMessageDate.toISOString(), "local", "DDD, MMM DD");
  const [dayName, restOfDate] = formattedDate.split(",");

  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-4 py-1">
        <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">
          {dayName},<span className="font-bold">{restOfDate}</span>
        </p>
      </div>
    </div>
  );
};

function ChatWithKarmaCoPilot({
  projects,
  chatHook,
  isLoadingProjects,
}: {
  projects: any[];
  chatHook: ReturnType<typeof useChat>;
  isLoadingProjects: boolean;
}) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isLoadingChat,
    isStreaming,
  } = chatHook;

  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change or when streaming
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, []); // Added input to dependencies

  // Modified handleInputChange to include scrolling
  const handleLocalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e);
    // Scroll after a short delay to ensure the DOM has updated
    setTimeout(() => {
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
    }, 0);
  };

  const hasMessages = messages.length > 0;

  // Find the last assistant message
  const lastAssistantMessageId = useMemo(() => {
    const assistantMessages = messages.filter((m) => m.role === "assistant" && m.content);
    return assistantMessages[assistantMessages.length - 1]?.id;
  }, [messages]);

  // Find the last user message
  const lastUserMessageId = useMemo(() => {
    const userMessages = messages.filter((m) => m.role === "user" && m.content);
    return userMessages[userMessages.length - 1]?.id;
  }, [messages]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const filteredMessages = messages.filter(
      (m) => (m.role === "user" || m.role === "assistant") && m.content
    );

    const groups: {
      [key: string]: { messages: typeof messages; firstMessageDate: Date };
    } = {};

    filteredMessages.forEach((message) => {
      if (message.timestamp) {
        const date = new Date(message.timestamp);
        const dateKey = date.toISOString().split("T")[0];
        if (!groups[dateKey]) {
          groups[dateKey] = {
            messages: [],
            firstMessageDate: date,
          };
        }
        groups[dateKey].messages.push(message);
      }
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [messages]);

  // Helper function to determine if a message is last in its sequence
  const isLastInSequence = (messages: typeof chatHook.messages, index: number) => {
    if (index === messages.length - 1) return true;
    const currentMessage = messages[index];
    const nextMessage = messages[index + 1];
    return currentMessage.role !== nextMessage.role;
  };

  useEffect(() => {
    // Only scroll when streaming is complete and there are messages
    if (!isStreaming && messages.length > 0 && messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-800">
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={messageContainerRef}
          className="absolute inset-0 overflow-y-auto p-4 space-y-4 scroll-smooth"
        >
          {groupedMessages.map(([date, messagesInDay]) => (
            <div key={date}>
              <DateSeparator firstMessageDate={messagesInDay.firstMessageDate} />
              <div className="space-y-4">
                {messagesInDay.messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLastAssistantMessage={message.id === lastAssistantMessageId}
                    isLastUserMessage={message.id === lastUserMessageId}
                    isLastInSequence={isLastInSequence(messagesInDay.messages, index)}
                  />
                ))}
              </div>
            </div>
          ))}
          {isLoadingChat && <MessageSkeleton />}
        </div>
      </div>

      <div className="border-t dark:border-zinc-600 px-3 pt-4 pb-6">
        <ChatInput
          input={input}
          handleInputChange={handleLocalInputChange}
          handleSubmit={handleSubmit}
          isLoadingChat={isLoadingChat}
          isLoadingProjects={isLoadingProjects}
          placeholder="Ask anything about the participating projects"
          className={`${hasMessages ? "" : "max-w-3xl"} ${
            projects.length > 0 ? "" : " opacity-50 cursor-not-allowed pointer-events-none"
          }`}
        />
      </div>
    </div>
  );
}

function _ProjectCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[320px] h-[240px] rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-2">
      <div className="w-full flex flex-col gap-1">
        <div className="h-[4px] w-full rounded-full bg-gray-200 dark:bg-zinc-800 mb-2.5 animate-pulse" />
        <div className="flex w-full flex-col px-3">
          <div className="h-6 w-3/4 mb-1 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-1/2 mb-2 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="flex flex-col gap-1 h-[64px]">
            <div className="h-4 w-full bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex w-full flex-row flex-wrap justify-start gap-1 mt-4">
        <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 rounded-full animate-pulse" />
        <div className="h-8 w-32 bg-gray-200 dark:bg-zinc-800 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const pickColor = useCallback((index: number) => {
    return cardColors[index % cardColors.length];
  }, []);

  const cardColor = useMemo(() => pickColor(index), [pickColor, index]);

  return (
    <ExternalLink
      href={PAGES.PROJECT.OVERVIEW(project?.projectUID)}
      className="w-full flex-1 flex flex-row items-center gap-3 max-w-full bg-white dark:bg-zinc-900 p-3 relative"
    >
      <div
        className="absolute left-3 top-3 bottom-3 w-1 rounded-full"
        style={{ background: cardColor }}
      />
      <div className="flex flex-col w-full flex-1 gap-3 pl-4">
        <div className="w-full flex flex-1 flex-col gap-1">
          <div className="flex w-full flex-col px-3">
            <div className="flex flex-row items-center gap-2 mb-1">
              <div className="flex justify-center">
                <ProfilePicture
                  imageURL={project.projectDetails.data?.imageURL}
                  name={project.projectUID || ""}
                  size="32"
                  className="h-8 w-8 min-w-8 min-h-8 border border-white shadow-sm"
                  alt={project.projectDetails.data?.title || "Project"}
                />
              </div>
              <p className="line-clamp-1 break-all text-base font-semibold text-gray-900 dark:text-zinc-200 max-2xl:text-sm flex-1">
                {project.projectDetails.data?.title?.slice(0, 200)}
              </p>
            </div>

            <div className="flex flex-col gap-1 flex-1 h-[64px] w-full max-w-full">
              <div className="line-clamp-2 w-full break-normal text-sm font-normal text-black dark:text-zinc-100 max-2xl:text-sm">
                {sanitizeMarkdown(project.projectDetails.data?.description?.slice(0, 200) || "")}
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center justify-start gap-4 mt-2 flex-wrap">
            {Array.from(new Set(project?.project_categories || [])).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(project?.project_categories || [])).map((category, i) => (
                  <div
                    key={i}
                    className="flex h-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2"
                  >
                    <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                      {category}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {project.updates.length > 0 && (
              <div className="flex h-max items-center justify-start rounded-full bg-teal-50 dark:bg-teal-700 text-teal-600 dark:text-teal-200 px-3 py-1 max-2xl:px-2">
                <p className="text-center text-sm font-medium text-teal-600 dark:text-teal-100 max-2xl:text-[13px]">
                  {project.updates.length || 0} {pluralize("Updates", project.updates.length || 0)}
                </p>
              </div>
            )}
            {project.impacts?.length > 0 && (
              <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
                <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                  {project.impacts.length || 0} {pluralize("Impacts", project.impacts.length || 0)}
                </p>
              </div>
            )}
            {project.milestones.length > 0 && (
              <div className="flex h-max items-center justify-start rounded-full bg-blue-50 dark:bg-blue-700 text-blue-600 dark:text-blue-200 px-3 py-1 max-2xl:px-2">
                <p className="text-center text-sm font-medium text-blue-600 dark:text-blue-100 max-2xl:text-[13px]">
                  {project.milestones.length || 0}{" "}
                  {pluralize("Milestones", project.milestones.length || 0)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="px-2 w-max">
        <button
          className="hover:text-gray-300 dark:hover:text-zinc-300 rounded-full transition-colors"
          aria-label={`Ask about ${project.projectDetails.data?.title}`}
        >
          <ChevronRightIcon className="w-6 h-6 min-h-6 min-w-6 text-gray-500 dark:text-zinc-400" />
        </button>
      </div>
    </ExternalLink>
  );
}

const MemoizedProjectCard = React.memo(ProjectCard);

interface ProjectsSidebarProps {
  projects: Project[];
  isLoadingProjects: boolean;
  programName: string;
}

function ProjectsSidebar({ projects, isLoadingProjects, programName }: ProjectsSidebarProps) {
  return (
    <div className="w-1/4 max-md:w-full max-md:h-1/2 overflow-y-auto bg-gray-50 dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-600">
      <h2 className="text-zinc-800 text-sm font-bold dark:text-white px-3 py-4">
        Projects in {programName}
      </h2>
      {isLoadingProjects ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
        </div>
      ) : (
        projects.map((project, index) => (
          <MemoizedProjectCard key={project.projectUID} project={project} index={index} />
        ))
      )}
    </div>
  );
}

function ChatScreen({
  projects,
  isLoadingProjects,
  selectedProgram,
  setSelectedProgram,
}: {
  projects: Project[];
  isLoadingProjects: boolean;
  selectedProgram: Program;
  setSelectedProgram: (program: Program | null) => void;
}) {
  const [, copy] = useCopyToClipboard();
  const chatScreenRef = useRef<HTMLDivElement>(null);
  const chatHook = useChat({
    body: {
      projects: projects,
      projectsInProgram: projects.map((project) => ({
        uid: project.projectUID,
        projectTitle: project.projectDetails.data?.title,
      })),
      programId: selectedProgram.programId,
      chainId: selectedProgram.chainID.toString(),
      communityId: useParams().communityId as string,
    },
  });

  const {
    messages,
    input,
    handleInputChange,
    setInput,
    handleSubmit,
    isLoading: isLoadingChat,
    isStreaming,
  } = chatHook;

  const _handleProjectClick = useCallback(
    (title: string) => {
      setInput((currentInput) => {
        if (!currentInput) return title;
        return `${currentInput.trim()} ${title}`;
      });
    },
    [setInput]
  );

  const handleShare = () => {
    copy(window.location.href, "Link copied to clipboard!");
  };

  useEffect(() => {
    if (messages.length === 1) {
      chatScreenRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div ref={chatScreenRef} className="flex w-full h-full max-md:flex-col flex-row">
        <ProjectsSidebar
          projects={projects}
          isLoadingProjects={isLoadingProjects}
          programName={selectedProgram.name}
        />

        <div className="flex flex-1 items-center justify-center h-full bg-gray-50 dark:bg-zinc-900">
          <SuggestionsBlock
            projects={projects}
            selectedProgram={selectedProgram}
            onClose={() => setSelectedProgram(null)}
            chatHook={chatHook}
            isLoadingProjects={isLoadingProjects}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={chatScreenRef} className="flex w-full h-full max-md:flex-col flex-row">
      <ProjectsSidebar
        projects={projects}
        isLoadingProjects={isLoadingProjects}
        programName={selectedProgram.name}
      />

      {selectedProgram && (
        <div className="w-3/4 max-lg:w-full bg-white dark:bg-zinc-900 flex flex-col items-center h-full">
          <div className="flex flex-row gap-4 items-center justify-between w-full px-3 py-4 border-b border-gray-200 dark:border-zinc-600">
            <div className="flex flex-row gap-3 items-center">
              <Image
                src="/logo/logo-dark.png"
                width={40}
                height={40}
                alt={`${PROJECT_NAME} Logo`}
                quality={75}
              />
              <div className="flex flex-col gap-0">
                <p className="text-zinc-800 dark:text-zinc-200 text-lg font-semibold">
                  Ask Karma AI
                </p>
                <p className="text-gray-600 dark:text-zinc-400 text-sm font-normal">
                  {messages.length > 0 && messages[0].timestamp
                    ? `Started ${formatDate(messages[0].timestamp, "local", "DDD, MMM DD")}`
                    : "No messages yet"}
                </p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="flex flex-row rounded items-center h-max hover:opacity-80 justify-center gap-2 px-3 py-2 border border-brand-blue text-brand-blue bg-transparent"
              aria-label="Share current page"
            >
              Share <ShareIcon className="w-5 h-5 min-h-5 min-w-5  max-h-5 max-w-5" />
            </button>
          </div>
          <div className="w-full flex-1">
            <ChatWithKarmaCoPilot
              projects={projects}
              chatHook={chatHook}
              isLoadingProjects={isLoadingProjects}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const CommunityProjectEvaluatorPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = params.communityId as string;
  const programId = searchParams.get("programId");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [[programsRes, programsError]] = await Promise.all([
          fetchData(INDEXER.COMMUNITY.PROGRAMS(communityId)),
        ]);
        if (programsError) {
          console.error("Error fetching programs:", programsError);
        }
        setPrograms(programsRes);

        // If we have a programId in the URL, find and select that program
        if (programId && programsRes) {
          const program = programsRes.find((p: Program) => p.programId === programId);
          if (program) {
            setSelectedProgram(program);
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [communityId, programId]);

  async function getProjectsByProgram(programId: string, chainId: number, communityId: string) {
    try {
      setIsLoadingProjects(true);
      const [projects, error] = (await fetchData(
        INDEXER.PROJECTS.BY_PROGRAM(programId, chainId, communityId)
      )) as [Project[], string | null, any];
      if (error) {
        console.error("Error fetching projects:", error);
        return;
      }

      setProjects(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  }

  useEffect(() => {
    if (selectedProgram) {
      setProjects([]);
      setIsLoading(true);
      getProjectsByProgram(selectedProgram.programId, Number(selectedProgram.chainID), communityId);
      setIsLoading(false);
    }
  }, [selectedProgram, communityId, getProjectsByProgram]);

  // Function to handle program selection
  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
    setProjects([]); // Clear previous projects

    // Update URL with the selected program ID
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("programId", program.programId);
    router.push(`${window.location.pathname}?${newSearchParams.toString()}`);

    getProjectsByProgram(program.programId, Number(program.chainID), communityId);
  };

  return (
    <div className="flex flex-col w-full h-full min-h-screen">
      {!selectedProgram ? (
        <div className="flex flex-col w-full h-flex flex-1 bg-gray-50 dark:bg-zinc-900 p-4">
          <div className="flex flex-col w-full py-24 h-max max-sm:py-8">
            <div className="flex flex-col items-center justify-center flex-1 h-full ">
              <div className="flex flex-col items-center justify-center gap-2">
                <Image
                  src="/logo/logo-dark.png"
                  width={80}
                  height={80}
                  alt="Karma AI Logo"
                  className={`text-sm font-medium mb-1 text-primary-600`}
                  quality={100}
                />
                <div className="flex flex-col items-center justify-center gap-0">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                    Karma AI
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-zinc-400 text-center mb-4">
                    Your AI companion for smarter project evaluation
                  </p>
                </div>
              </div>
              <div className="w-1/2 mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col justify-center items-center">
                    <SearchDropdown
                      onSelectFunction={(value) => {
                        const program = programs.find((p: Program) => p.name === value);
                        if (program) {
                          handleProgramSelect(program);
                        }
                      }}
                      selected={selectedProgram ? [(selectedProgram as Program).name] : []}
                      list={programs.length > 0 ? programs.map((p: Program) => p.name) : []}
                      type="program"
                      prefixUnselected="Select a "
                      buttonClassname="w-full max-w-[684px]"
                      canSearch={true}
                      shouldSort={true}
                      placeholderText="Search and select a program"
                      leftIcon={
                        <Image
                          src="/logo/karma-logo.svg"
                          width={24}
                          height={24}
                          alt="Karma AI Logo"
                        />
                      }
                      paragraphClassname="text-[16px] text-gray-600 dark:text-zinc-400"
                      rightIcon={
                        <MagnifyingGlassIcon className="h-5 w-5 text-black dark:text-white" />
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full h-screen">
          <ChatScreen
            projects={projects}
            isLoadingProjects={isLoadingProjects}
            selectedProgram={selectedProgram}
            setSelectedProgram={setSelectedProgram}
          />
        </div>
      )}
    </div>
  );
};
