import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { useEffect, useState } from "react";

interface ProgramCardProps {
    programId: string;
    chainID: number;
    minimal?: boolean;
}

export const ProgramCard = ({
    programId,
    chainID,
    minimal = false,
}: ProgramCardProps) => {
    const [program, setProgram] = useState<GrantProgram | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadProgram() {
            try {
                setIsLoading(true);
                const [result, error] = await fetchData(INDEXER.REGISTRY.FIND_BY_ID(programId, chainID));
                if (error) throw error;
                setProgram(result);
            } catch (error) {
                console.error("Failed to load program:", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadProgram();
    }, [programId, chainID]);

    if (isLoading) return <ProgramCardSkeleton />;
    if (!program) return null;

    return (
        <div className="inline-flex items-center gap-2 text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full border border-gray-200 dark:border-zinc-700">
            <span className="font-medium truncate max-w-[150px]">
                {program.metadata?.title || "Untitled Program"}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
                Chain {chainID}
            </span>
        </div>
    );
};

export const ProgramCardSkeleton = () => {
    return (
        <div className="inline-flex items-center gap-2 text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full border border-gray-200 dark:border-zinc-700 animate-pulse">
            <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-700 rounded" />
            <div className="h-3 w-12 bg-gray-200 dark:bg-zinc-700 rounded" />
        </div>
    );
};

