"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Listbox } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { ChevronUpDownIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useChat } from 'ai/react';
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import React from "react";

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
                <div className="text-sm font-medium mb-1 text-gray-900">Karma Co-pilot</div>
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
    const { messages, input, handleInputChange, handleSubmit, isLoading: isLoadingChat, } = useChat({
        maxSteps: 3,
        body: {
            projectsFilter: projects.map((project) => ({ uid: project.uid, chainId: project.chainID }))
        }
    });



    const hasMessages = messages.length > 0;

    const renderChatInput = () => (
        <form
            onSubmit={handleSubmit}
            className={`relative w-full ${hasMessages ? '' : 'max-w-3xl'} ${projects.length > 0 ? '' : 'bg-zinc-300 opacity-50 cursor-not-allowed pointer-events-none'}`}
            role="search"
            aria-label="Chat with Karma Co-pilot"
        >
            <input
                className="w-full p-4 pr-12 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                value={input}
                placeholder="Ask about the program or projects..."
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

    if (!hasMessages) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[580px] mx-auto px-4 mb-8 animate-fade-in">
                <div className="text-center mb-3">
                    <h1 className="mb-3 text-5xl font-bold text-gray-900">
                        Karma Co-pilot
                    </h1>
                    <p className="text-xl text-gray-600">The only AI assistant you&apos;ll need to evaluate projects</p>
                    <div className="text-xl text-gray-700 font-medium mt-4">Use Karma Co-pilot to:</div>
                </div>
                <div className="flex justify-between items-center mb-8 w-full gap-4">
                    <div className="bg-zinc-100 rounded-3xl p-2 text-lg text-gray-700">✅ Compare projects within the program</div>
                    <div className="bg-zinc-100 rounded-3xl p-2 text-lg text-gray-700">✅ Analyze project metrics, updates, outcomes and impact</div>
                    <div className="bg-zinc-100 rounded-3xl p-2 text-lg text-gray-700">🚫 Order a pizza</div>
                </div>
                {renderChatInput()}
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-[500px] bg-white rounded-lg border shadow-sm mb-8">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(m => (
                    <div
                        key={m.id}
                        className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                    >
                        <div className={`max-w-[80%] rounded-xl p-3 ${m.role === 'assistant'
                            ? 'bg-gray-100 text-gray-900'
                            : 'border border-primary-500 text-white'
                            }`}>
                            {m.role === 'assistant' && <div className={`text-sm font-medium mb-1 text-primary-600`}>
                                Karma Co-pilot
                            </div>}
                            {m.content.length > 0 ? (
                                <MarkdownPreview source={m.content} />
                            ) : (
                                <p className="whitespace-pre-wrap text-md font-light">
                                    {`Analyzing projects and gathering insights...`} <br />{m?.toolInvocations?.[0]?.toolName}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
                {isLoadingChat && <MessageSkeleton />}
            </div>

            {/* Input Container - Fixed at Bottom */}
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
                    </div> <div className="flex flex-row flex-wrap gap-1 mt-4">

                    </div>
                </div>
            </div>
            <div className="flex w-full flex-row flex-wrap justify-start gap-1 mt-4">
                {Array.from(new Set(project?.categories || [])).length > 0 && <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
                    {Array.from(new Set(project?.categories || [])).map((category, i) => (
                        <p key={i} className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                            {category}
                        </p>
                    ))}
                </div>}
                {project.impacts.length > 0 && <div className="flex h-max w-max items-center justify-start rounded-full bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-gray-300 px-3 py-1 max-2xl:px-2">
                    <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-100 max-2xl:text-[13px]">
                        {project.impacts.length || 0} Impacts
                    </p>
                </div>}
                {project.milestones.length > 0 && <div className="flex h-max w-max items-center justify-start rounded-full bg-teal-50 dark:bg-teal-700 text-teal-600 dark:text-teal-200 px-3 py-1 max-2xl:px-2">
                    <p className="text-center text-sm font-medium text-teal-600 dark:text-teal-100 max-2xl:text-[13px]">
                        {project.milestones.length || 0} Milestones
                    </p>
                </div>}
                {project.updates.length > 0 && <div className="flex h-max w-max items-center justify-start rounded-full bg-teal-50 dark:bg-teal-700 text-teal-600 dark:text-teal-200 px-3 py-1 max-2xl:px-2">
                    <p className="text-center text-sm font-medium text-teal-600 dark:text-teal-100 max-2xl:text-[13px]">
                        {project.updates.length || 0} Updates
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
            setIsLoading(true);
            const [projects, error] = await fetchData(INDEXER.PROJECTS.BY_PROGRAM(programId, chainId));
            if (error) {
                console.error("Error fetching projects:", error);
                return;
            }
            setProjects(projects);
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setIsLoading(false);
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex-shrink-0">
            <div className="flex flex-col gap-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Ask questions about this program and let <span className="text-primary-500">Karma Co-pilot</span> <br /> help you evaluate projects in this community.
                    </h2>

                    <div className="flex justify-between items-center gap-4">
                        <label className="block text-lg font-medium text-gray-700">Select a program</label>
                        <Listbox value={selectedProgram} onChange={(program) => {
                            setSelectedProgram(program);

                        }}>
                            <div className="relative mt-1">
                                <ListboxButton className="relative w-full cursor-default rounded-lg bg-white py-3 pl-4 pr-10 text-left border border-gray-200 shadow-sm hover:border-gray-400 transition-colors focus:outline-none focus-visible:border-gray-700 focus-visible:ring-2 focus-visible:ring-gray-400">
                                    <span className="block truncate text-gray-900">
                                        {selectedProgram?.name || "No program selected"}
                                    </span>
                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </span>
                                </ListboxButton>
                                <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none">
                                    {programs.map((program) => (
                                        <ListboxOption
                                            key={program.programId}
                                            value={program}
                                            className={({ active }) =>
                                                `relative cursor-pointer select-none py-3 pl-4 pr-9 ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-900'}`
                                            }
                                        >
                                            {program.name}
                                        </ListboxOption>
                                    ))}
                                </ListboxOptions>
                            </div>
                        </Listbox>
                    </div>
                </div>

                {selectedProgram && (
                    <div className="flex flex-col gap-6">
                        <ProjectsMarquee projects={projects} isLoading={isLoading} />
                        <ChatWithKarmaCoPilot projects={projects} />
                    </div>
                )}
            </div>
        </div>
    );
}

