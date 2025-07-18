import { useProjectImpactIndicators } from "@/hooks/useProjectImpactIndicators";
import formatCurrency from "@/utilities/formatCurrency";
import pluralize from "pluralize";

// Global variables for indicator types
const GITHUB_COMMITS = "GitHub Commits";
const NO_OF_TXS = "no_of_txs";

interface ProjectImpactProps {
  projectId: string;
}

export const ProjectImpact = ({ projectId }: ProjectImpactProps) => {
  const {
    data: impactIndicators = {},
  } = useProjectImpactIndicators(projectId, {
    [NO_OF_TXS]: 30,
    [GITHUB_COMMITS]: 120
  });

  const hasAnyImpactIndicators = Object.keys(impactIndicators).length > 0 && 
    Object.values(impactIndicators).some(indicator => indicator.totalValue > 0);

  if (!hasAnyImpactIndicators) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-black dark:text-zinc-401 font-bold text-sm">
        Project impact
      </p>
      <div className="flex flex-row  max-lg:flex-col gap-4">
        {impactIndicators[NO_OF_TXS] && 
          impactIndicators[NO_OF_TXS].totalValue > 0 && (
          <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
            <div className="flex flex-col gap-3">
              <p className="text-black dark:text-zinc-301 dark:bg-zinc-800 text-2xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px]  min-w-[40px] w-max h-max">
                {formatCurrency(impactIndicators[NO_OF_TXS].totalValue)}
              </p>
              <div className="flex flex-row gap-3">
                <p className="font-normal text-brand-gray text-sm dark:text-zinc-301">
                  {pluralize("Transaction", impactIndicators[NO_OF_TXS].totalValue)}
                </p>
              </div>
            </div>
          </div>
        )}
        {impactIndicators[GITHUB_COMMITS] &&
          impactIndicators[GITHUB_COMMITS].totalValue > 0 && (
          <div className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center">
            <div className="flex flex-col gap-3">
              <p className="text-black dark:text-zinc-301 dark:bg-zinc-800 text-2xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px]  min-w-[40px] w-max h-max">
                {formatCurrency(impactIndicators[GITHUB_COMMITS].totalValue)}
              </p>
              <div className="flex flex-row gap-3">
                <p className="font-normal text-brand-gray text-sm dark:text-zinc-301">
                  {pluralize("Git Commit", impactIndicators[GITHUB_COMMITS].totalValue)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 