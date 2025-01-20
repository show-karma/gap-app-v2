"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Listbox } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { ChevronUpDownIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useChat } from 'ai/react';
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";

interface Program {
    programId: string;
    name: string;
    chainID: string
}

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

function ChatWithKarmaCoPilot({ programId }: { programId: string }) {
    const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
        maxSteps: 3,
        body: {
            programId
        }
    });



    const hasMessages = messages.length > 0;

    const renderChatInput = () => (
        <form onSubmit={handleSubmit} className={`relative w-full ${hasMessages ? '' : 'max-w-3xl'}`}>
            <input
                className="w-full p-4 pr-12 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                value={input}
                placeholder="Ask about the program or projects..."
                onChange={handleInputChange}
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <PaperAirplaneIcon className="h-5 w-5" />
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
                                    {`Analyzing projects and gathering insights...`}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && <MessageSkeleton />}
            </div>

            {/* Input Container - Fixed at Bottom */}
            <div className="border-t p-4">
                {renderChatInput()}
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
                        <Listbox value={selectedProgram} onChange={setSelectedProgram}>
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

                {selectedProgram &&
                    <ChatWithKarmaCoPilot programId={`${selectedProgram.programId}_${selectedProgram.chainID}`} />
                }
            </div>
        </div>
    );
}

