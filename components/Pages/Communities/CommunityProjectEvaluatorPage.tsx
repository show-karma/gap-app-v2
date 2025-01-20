"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Listbox } from "@headlessui/react";
import { Button } from "@/components/Utilities/Button";
import { ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useChat } from 'ai/react';
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";



interface Program {
    programId: string;
    name: string;
    chainID: string
}


function ChatWithKarmaCoPilot({ programId }: { programId: string }) {
    const { messages, input, handleInputChange, handleSubmit } = useChat({
        maxSteps: 3,
        body: {
            programId
        }
    });
    return <div className="flex flex-col justify-start items-center gap-4">
        <div className="flex flex-col w-full stretch">
            <form onSubmit={handleSubmit}>
                <input
                    className="w-full mb-3 border border-gray-300 rounded shadow-md"
                    value={input}
                    placeholder="Say something..."
                    onChange={handleInputChange}
                />
            </form>

            <div className="h-[400px] overflow-y-auto rounded-lg border shadow-inner p-4 space-y-4 mb-6">
                {messages.map(m => (
                    <div
                        key={m.id}
                        className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                    >
                        <div className={`max-w-[80%] rounded-lg p-3 ${m.role === 'assistant'
                            ? 'bg-zinc-100 text-gray-900'
                            : 'border border-gray-300 text-primary-500'
                            }`}>
                            <div className={`text-sm font-medium mb-1 ${m.role === 'assistant' ? 'text-gray-900' : 'text-gray-900'}`}>
                                {m.role === 'assistant' ? 'Karma Co-pilot' : 'You'}
                            </div>
                            {m.content.length > 0 ? (
                                <MarkdownPreview source={m.content} />
                            ) : (
                                <p className="whitespace-pre-wrap text-md italic font-light">
                                    {'calling tool: ' + m?.toolInvocations?.[0].toolName}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex p-4 max-w-[1920px] mx-auto">
            {/* Left Side - Form */}
            <div className="w-full lg:w-[600px] flex-shrink-0">
                <div className="flex flex-col gap-8">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Ask questions about this program and let <span className="text-primary-500">Karma Co-pilot</span> help you evaluate projects.
                    </h2>

                    <div className="flex justify-between items-center gap-4">
                        <label className="block text-lg font-medium text-gray-700">Select a program</label>
                        <Listbox value={selectedProgram} onChange={setSelectedProgram}>
                            <div className="relative mt-1">
                                <ListboxButton className="relative w-full cursor-default rounded-lg bg-white py-3 pl-4 pr-10 text-left border border-gray-200 shadow-sm hover:border-primary/50 transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20">
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
                                                `relative cursor-pointer select-none py-3 pl-4 pr-9 ${active ? 'bg-primary/5 text-primary' : 'text-gray-900'
                                                }`
                                            }
                                        >
                                            {program.name}
                                        </ListboxOption>
                                    ))}
                                </ListboxOptions>
                            </div>
                        </Listbox>
                    </div>


                    {selectedProgram &&
                        <ChatWithKarmaCoPilot programId={`${selectedProgram.programId}_${selectedProgram.chainID}`} />
                    }
                </div>
            </div>
        </div>
    );
};

