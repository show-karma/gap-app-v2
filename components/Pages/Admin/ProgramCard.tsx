import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { cn } from "@/utilities/tailwind";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { useProgramRegistry } from "@/hooks/useProgramRegistry";

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
  const {
    data: program,
    isLoading,
    error,
  } = useProgramRegistry(programId, chainID);

  if (isLoading) return <ProgramCardSkeleton />;
  if (error || !program) return null;

  // Handle both single program and array responses
  const programData = Array.isArray(program) ? program[0] : program;

  return (
    <div className="inline-flex items-center gap-2 text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full border border-gray-200 dark:border-zinc-700">
      <span
        className={cn(
          "font-medium max-w-[150px]",
          minimal ? "w-max max-w-[full] truncate" : ""
        )}
      >
        {programData.metadata?.title || "Untitled Program"}
      </span>
      <span className="text-gray-500 dark:text-gray-400">
        Chain {chainNameDictionary(chainID)}
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
