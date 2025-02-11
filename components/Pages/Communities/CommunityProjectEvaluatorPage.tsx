"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Listbox } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import {
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import {
  ChevronUpDownIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useChat } from "./useChat";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import React from "react";
import { envVars } from "@/utilities/enviromentVars";

interface Program {
  programId: string;
  name: string;
  chainID: string;
}

interface Project {
  projectUID: string;
  grantUID: string;
  milestone_count: number;
  milestones: {
    description: string;
    title: string;
    endsAt: string;
    startsAt: string;
    status: {
      approved: boolean;
      completed: boolean;
      rejected: boolean;
    };
  }[];
  program: {
    programId: string;
    name: string;
    description: string;
  }[];
  updates: {
    title: string;
    text: string;
    type: string;
  }[];
  projectDetails: {
    uid: string;
    data: {
      title: string;
      description: string;
      problem: string;
      missionSummary: string;
      locationOfImpact: string;
      imageURL: string;
      links: any[];
      slug: string;
      tags: string[];
      businessModel: string;
      stageInLife: string;
      raisedMoney: boolean;
    };
  };
}

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
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-3 bg-zinc-100">
        <div className="text-sm font-medium mb-1 text-gray-900">
          Karma Beacon
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
        </div>
      </div>
    </div>
  );
}

function ChatWithKarmaCoPilot({
  communityId,
  projectsInProgram,
}: {
  communityId: string;
  projectsInProgram: { uid: string; projectTitle: string }[];
}) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isLoadingChat,
    isStreaming,
  } = useChat({
    body: {
      projectsInProgram,
    },
  });

  const ChatFormRef = useRef<HTMLFormElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    // Only scroll when streaming is complete and there are messages
    if (!isStreaming && messages.length > 0 && messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const renderChatInput = () => (
    <form
      ref={ChatFormRef}
      onSubmit={handleSubmit}
      className={`relative w-full ${hasMessages ? "" : "max-w-3xl"} ${
        true
          ? ""
          : "bg-zinc-300 opacity-50 cursor-not-allowed pointer-events-none"
      }`}
      role="search"
      aria-label="Chat with Karma Beacon"
    >
      <input
        className="w-full p-4 pr-12 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
        value={input}
        placeholder="Ask anything about the participating projects"
        onChange={handleInputChange}
        disabled={isLoadingChat}
        aria-label="Chat input"
        role="searchbox"
        aria-disabled={isLoadingChat}
      />
      <button
        type="submit"
        disabled={isLoadingChat || !input.trim()}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        <PaperAirplaneIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  );

  return (
    <div className="relative flex flex-col h-[500px] bg-white rounded-lg border shadow-sm mb-8">
      <div
        ref={messageContainerRef}
        data-chat-container
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages
          .filter(
            (m) => (m.role == "user" || m.role == "assistant") && m.content
          )
          .map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-3 ${
                  m.role === "assistant"
                    ? "bg-gray-100 text-gray-900"
                    : "border border-primary-500 text-white"
                }`}
              >
                {m.role === "assistant" && (
                  <div className={`text-sm font-medium mb-1 text-primary-600`}>
                    Karma Beacon
                  </div>
                )}
                {m.content ? (
                  <MarkdownPreview source={m.content} />
                ) : (
                  <div className="whitespace-pre-wrap text-md font-light">
                    {`Analyzing projects and gathering insights...`}
                  </div>
                )}
              </div>
            </div>
          ))}
        {isLoadingChat && <MessageSkeleton />}
      </div>

      <div className="border-t p-4">{renderChatInput()}</div>
    </div>
  );
}

function ProjectCardSkeleton() {
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

  // Safely access nested properties
  const tags = project?.projectDetails?.data?.tags || [];
  const title = project?.projectDetails?.data?.title || "Untitled Project";
  const description =
    project?.projectDetails?.data?.description || "No description available";
  const updates = project?.updates || [];

  console.log("project tags", tags);

  return (
    <div className="flex-shrink-0 w-[320px] rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-2">
      <div className="w-full flex flex-col gap-1">
        <div
          className="h-[4px] w-full rounded-full mb-2.5"
          style={{ background: cardColor }}
        />
        <div className="flex w-full flex-col px-3">
          <p className="line-clamp-1 break-all text-base font-semibold text-gray-900 dark:text-zinc-200 max-2xl:text-sm mr-1">
            {title}
          </p>
          <p className="mb-2 text-sm font-medium text-gray-400 dark:text-zinc-400 max-2xl:text-[13px]">
            Project ID: {project.projectUID}
          </p>
          <div className="flex flex-col gap-1 flex-1 h-[64px]">
            <div className="text-sm text-gray-900 dark:text-gray-400 text-ellipsis line-clamp-2">
              {description}
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center justify-start gap-4 mt-2">
          {/* {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(tags)).map((tag, i) => (
                <div
                  key={i}
                  className="flex h-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2"
                >
                  <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                    {tag}
                  </p>
                </div>
              ))}
            </div>
          )} */}

          {updates.length > 0 && (
            <div className="flex h-max items-center justify-start rounded-full bg-teal-50 dark:bg-teal-700 text-teal-600 dark:text-teal-200 px-3 py-1 max-2xl:px-2">
              <p className="text-center text-sm font-medium text-teal-600 dark:text-teal-100 max-2xl:text-[13px]">
                Updates: {updates.length}
              </p>
            </div>
          )}
        </div>
        {project.milestone_count > 0 && (
          <div className="flex h-max w-max items-center justify-start rounded-full bg-teal-50 dark:bg-teal-700 text-teal-600 dark:text-teal-200 px-3 py-1 max-2xl:px-2">
            <p className="text-center text-sm font-medium text-teal-600 dark:text-teal-100 max-2xl:text-[13px]">
              Milestones: {project.milestone_count}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const MemoizedProjectCard = React.memo(ProjectCard);

export const CommunityProjectEvaluatorPage = () => {
  const params = useParams();
  const communityId = params.communityId as string;

  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  async function getProjectsByCommunity(communityId: string) {
    try {
      setIsLoadingProjects(true);
      const [projects, error] = await fetchData(
        `/projects/by-community?communityId=${communityId}`
      );
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
    console.log("communityId", communityId);
    setProjects([]);
    getProjectsByCommunity(communityId);
  }, [communityId]);

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="flex w-full h-full">
        <div className="w-1/4 overflow-y-auto p-4 bg-gray-50 border-r border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Projects</h2>
          {isLoadingProjects ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
            </div>
          ) : (
            projects.map((project, index) => (
              <MemoizedProjectCard
                key={project.projectUID}
                project={project}
                index={index}
              />
            ))
          )}
        </div>

        {!isLoadingProjects && (
          <div className="w-3/4 p-4 bg-white">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Chat with Karma Beacon
            </h2>
            <ChatWithKarmaCoPilot
              communityId={communityId}
              projectsInProgram={projects.map((project) => ({
                uid: project.projectUID,
                projectTitle: project.projectDetails.data.title,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
};
