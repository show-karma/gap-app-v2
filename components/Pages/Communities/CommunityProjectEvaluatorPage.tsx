"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Listbox } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { ChevronUpDownIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useChat } from './useChat';
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import React from "react";
import { envVars } from "@/utilities/enviromentVars";

interface Program {
    programId: string;
    name: string;
    chainID: string
}

interface Project {
    uid: string;
    chainID: number;
    createdBy: string;
    createdAt: string;
    details: {
        title: string;
        description: string;
        [key: string]: any;
    };
    categories: string[];
    impacts: any[];
    updates: any[];
    milestones: any[];
}

const cardColors = [
    "#5FE9D0", "#875BF7", "#F97066", "#FDB022", "#A6EF67",
    "#84ADFF", "#EF6820", "#EE46BC", "#EEAAFD", "#67E3F9",
] as const;

function MessageSkeleton() {
    return (
        <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-zinc-100">
                <div className="text-sm font-medium mb-1 text-gray-900">Karma Beacon</div>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
            </div>
        </div>
    );
}

function ChatWithKarmaCoPilot({ projects }: { projects: any[] }) {
    const { messages, input, handleInputChange, handleSubmit, isLoading: isLoadingChat, setMessages } = useChat({
        body: {
            projectsInProgram: projects.map((project) => ({ uid: project.uid, chainId: project.chainID, projectTitle: project.details.title, projectCategories: project.categories }))
        },
    });

    const ChatFormRef = useRef<HTMLFormElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);

    const hasMessages = messages.length > 0;

    useEffect(() => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const renderChatInput = () => (
        <form
            ref={ChatFormRef}
            onSubmit={handleSubmit}
            className={`relative w-full ${hasMessages ? '' : 'max-w-3xl'} ${projects.length > 0 ? '' : 'bg-zinc-300 opacity-50 cursor-not-allowed pointer-events-none'}`}
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
            <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.filter(m => (m.role == "user" || m.role == "assistant") && m.content).map(m => (
                    <div
                        key={m.id}
                        className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                    >
                        <div className={`max-w-[80%] rounded-xl p-3 ${m.role === 'assistant'
                            ? 'bg-gray-100 text-gray-900'
                            : 'border border-primary-500 text-white'
                            }`}>
                            {m.role === 'assistant' && <div className={`text-sm font-medium mb-1 text-primary-600`}>
                                Karma Beacon
                            </div>}
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

            <div className="border-t p-4">
                {renderChatInput()}
            </div>
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

function ProjectCard({ project, index }: { project: Project, index: number }) {
    const pickColor = useCallback((index: number) => {
        return cardColors[index % cardColors.length];
    }, []);

    const cardColor = useMemo(() => pickColor(index), [pickColor, index]);

    return (
        <div className="flex-shrink-0 w-[320px] rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-2">
            <div className="w-full flex flex-col gap-1">
                <div
                    className="h-[4px] w-full rounded-full mb-2.5"
                    style={{ background: cardColor }}
                />
                <div className="flex w-full flex-col px-3">
                    <p className="line-clamp-1 break-all text-base font-semibold text-gray-900 dark:text-zinc-200 max-2xl:text-sm mr-1">
                        {project.details.title}
                    </p>
                    <p className="mb-2 text-sm font-medium text-gray-400 dark:text-zinc-400 max-2xl:text-[13px]">
                        Created on {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex flex-col gap-1 flex-1 h-[64px]">
                        <div className="text-sm text-gray-900 dark:text-gray-400 text-ellipsis line-clamp-2">
                            {project.details.description}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex w-full flex-col gap-2">
                <div className="flex items-center justify-start gap-4 mt-2">
                    {Array.from(new Set(project?.categories || [])).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(project?.categories || [])).map((category, i) => (
                                <div key={i} className="flex h-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
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
                                Updates: {project.updates.length || 0}
                            </p>
                        </div>
                    )}
                </div>
                {project.impacts.length > 0 && <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
                    <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                        Impacts: {project.impacts.length || 0}
                    </p>
                </div>}
                {project.milestones.length > 0 && <div className="flex h-max w-max items-center justify-start rounded-full bg-teal-50 dark:bg-teal-700 text-teal-600 dark:text-teal-200 px-3 py-1 max-2xl:px-2">
                    <p className="text-center text-sm font-medium text-teal-600 dark:text-teal-100 max-2xl:text-[13px]">
                        Milestones: {project.milestones.length || 0}
                    </p>
                </div>}
            </div>
        </div >
    );
}

const MemoizedProjectCard = React.memo(ProjectCard);

function ProjectsMarquee({ projects, isLoading }: { projects: Project[], isLoading: boolean }) {
    if (isLoading || !projects.length) {
        return (
            <div className="w-full overflow-hidden">
                <div className="flex gap-4 animate-marquee">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <ProjectCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden">
            <div className="flex gap-4 animate-marquee">
                {projects.map((project, index) => (
                    <MemoizedProjectCard key={project.uid} project={project} index={index} />
                ))}
                {projects.map((project, index) => (
                    <MemoizedProjectCard key={`${project.uid}-dup`} project={project} index={index + projects.length} />
                ))}
            </div>
        </div>
    );
}

export const CommunityProjectEvaluatorPage = () => {
    const params = useParams();
    const communityId = params.communityId as string;

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
                    fetchData(INDEXER.COMMUNITY.PROGRAMS(communityId))
                ]);
                if (programsError) {
                    console.error("Error fetching programs:", programsError);
                }
                setPrograms(programsRes);
            } catch (error) {
                console.error("Error fetching initial data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [communityId]);

    async function getProjectsByProgram(programId: string, chainId: number) {
        try {
            setIsLoadingProjects(true);
            const [projects, error] = await fetchData(INDEXER.PROJECTS.BY_PROGRAM(programId, chainId));
            if (error) {
                console.error("Error fetching projects:", error);
                return;
            }

            await fetchData(`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/karma-beacon`, "GET", {}, {
                projectUids: projects.map((project: Project) => project.uid).join(","),
            }, {}, false, true);

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
            getProjectsByProgram(selectedProgram.programId, Number(selectedProgram.chainID));
            setIsLoading(false);
        }
    }, [selectedProgram]);

    // Function to handle program selection
    const handleProgramSelect = (program: Program) => {
        setSelectedProgram(program);
        setProjects([]); // Clear previous projects
        getProjectsByProgram(program.programId, Number(program.chainID)); // Fetch projects for the selected program
    };

    return (
        <div className="flex flex-col w-full h-screen">
            {!selectedProgram ? (
                <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Karma Beacon</h1>
                    <p className="text-lg text-gray-600 text-center mb-4">
                        The only AI assistant you&apos;ll need to evaluate projects
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-4 mb-8 w-full">
                        <div className="bg-zinc-100 rounded-3xl p-4 text-lg text-gray-700 shadow-md">✅ Compare projects within the program</div>
                        <div className="bg-zinc-100 rounded-3xl p-4 text-lg text-gray-700 shadow-md">✅ Analyze project metrics, updates, outcomes and impact</div>
                    </div>
                    <div className="w-1/2 mt-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
                            </div>
                        ) : (
                            <Listbox value={selectedProgram} onChange={handleProgramSelect}>
                                <div className="relative">
                                    <Listbox.Button className="relative w-full cursor-default rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400">
                                        {selectedProgram ? selectedProgram : "Select a program"}
                                    </Listbox.Button>
                                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        {programs.map((program) => (
                                            <Listbox.Option key={program.programId} value={program} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-600 text-white' : 'text-gray-900'}`}>
                                                {program.name}
                                            </Listbox.Option>
                                        ))}
                                    </Listbox.Options>
                                </div>
                            </Listbox>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex w-full h-full">
                        <div className="w-1/4 overflow-y-auto p-4 bg-gray-50 border-r border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Projects</h2>
                            {isLoadingProjects ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
                                </div>
                            ) : (
                                projects.map((project, index) => (
                                    <MemoizedProjectCard key={project.uid} project={project} index={index} />
                                ))
                            )}
                        </div>

                        {selectedProgram && (
                            <div className="w-3/4 p-4 bg-white">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Chat with Karma Beacon</h2>
                                <ChatWithKarmaCoPilot projects={projects} />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

