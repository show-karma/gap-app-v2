"use client";

import { Badge } from "@/components/ui/badge";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import type { FundingProgramResponse, OpportunityType } from "../types/funding-program";

interface CardTypeDetailsProps {
  program: FundingProgramResponse;
}

export function CardTypeDetails({ program }: CardTypeDetailsProps) {
  const type: OpportunityType = program.type ?? "grant";

  switch (type) {
    case "hackathon":
      return <HackathonCardDetails program={program} />;
    case "bounty":
      return <BountyCardDetails program={program} />;
    case "accelerator":
      return <AcceleratorCardDetails program={program} />;
    case "vc_fund":
      return <VcFundCardDetails program={program} />;
    case "rfp":
      return <RfpCardDetails program={program} />;
    default:
      return null;
  }
}

function HackathonCardDetails({ program }: { program: FundingProgramResponse }) {
  const meta = program.hackathonMetadata;
  if (!meta) return null;

  const totalPrizePool = meta.prizes?.reduce((sum, p) => {
    const amount = typeof p.amount === "string" ? Number(p.amount) : p.amount;
    return sum + (Number.isNaN(amount) ? 0 : amount);
  }, 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {meta.location && (
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          {meta.location}
        </Badge>
      )}
      {meta.tracks && meta.tracks.length > 0 && (
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          {meta.tracks.length} {meta.tracks.length === 1 ? "track" : "tracks"}
        </Badge>
      )}
      {totalPrizePool !== undefined && totalPrizePool > 0 && (
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          ${formatCurrency(totalPrizePool)} prize pool
        </Badge>
      )}
    </div>
  );
}

function BountyCardDetails({ program }: { program: FundingProgramResponse }) {
  const meta = program.bountyMetadata;
  if (!meta?.reward) return null;

  const rewardAmount =
    typeof meta.reward.amount === "string" ? Number(meta.reward.amount) : meta.reward.amount;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {!Number.isNaN(rewardAmount) && rewardAmount > 0 && (
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          {meta.reward.currency === "USD" ? "$" : ""}
          {formatCurrency(rewardAmount)}
          {meta.reward.currency !== "USD" ? ` ${meta.reward.currency}` : ""}
        </Badge>
      )}
      {meta.difficulty && (
        <Badge
          variant="outline"
          className={cn(
            "rounded-full text-xs font-normal capitalize",
            meta.difficulty === "beginner" &&
              "border-green-200 text-green-700 dark:border-green-800 dark:text-green-400",
            meta.difficulty === "intermediate" &&
              "border-yellow-200 text-yellow-700 dark:border-yellow-800 dark:text-yellow-400",
            meta.difficulty === "advanced" &&
              "border-red-200 text-red-700 dark:border-red-800 dark:text-red-400"
          )}
        >
          {meta.difficulty}
        </Badge>
      )}
      {meta.skills && meta.skills.length > 0 && (
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          {meta.skills.slice(0, 2).join(", ")}
          {meta.skills.length > 2 ? ` +${meta.skills.length - 2}` : ""}
        </Badge>
      )}
    </div>
  );
}

function AcceleratorCardDetails({ program }: { program: FundingProgramResponse }) {
  const meta = program.acceleratorMetadata;
  if (!meta) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {meta.stage && (
        <Badge variant="outline" className="rounded-full text-xs font-normal capitalize">
          {meta.stage}
        </Badge>
      )}
      {meta.equity && (
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          {meta.equity} equity
        </Badge>
      )}
      {meta.funding &&
        !Number.isNaN(Number(meta.funding.amount)) &&
        Number(meta.funding.amount) > 0 && (
          <Badge variant="outline" className="rounded-full text-xs font-normal">
            Up to {meta.funding.currency === "USD" ? "$" : ""}
            {formatCurrency(Number(meta.funding.amount))}
            {meta.funding.currency !== "USD" ? ` ${meta.funding.currency}` : ""}
          </Badge>
        )}
    </div>
  );
}

function VcFundCardDetails({ program }: { program: FundingProgramResponse }) {
  const meta = program.vcFundMetadata;
  if (!meta) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {meta.stage && (
        <Badge variant="outline" className="rounded-full text-xs font-normal capitalize">
          {meta.stage}
        </Badge>
      )}
      {meta.checkSize && (
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          ${formatCurrency(meta.checkSize.min)} - ${formatCurrency(meta.checkSize.max)}
        </Badge>
      )}
      {meta.thesis && (
        <Badge
          variant="outline"
          className="rounded-full text-xs font-normal max-w-[180px] truncate"
        >
          {meta.thesis}
        </Badge>
      )}
    </div>
  );
}

function RfpCardDetails({ program }: { program: FundingProgramResponse }) {
  const meta = program.rfpMetadata;
  if (!meta) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {meta.issuingOrganization && (
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          {meta.issuingOrganization}
        </Badge>
      )}
      {meta.budget &&
        !Number.isNaN(Number(meta.budget.amount)) &&
        Number(meta.budget.amount) > 0 && (
          <Badge variant="outline" className="rounded-full text-xs font-normal">
            Budget: ${formatCurrency(Number(meta.budget.amount))}
          </Badge>
        )}
      {program.deadline && (
        <Badge variant="outline" className="rounded-full text-xs font-normal">
          Due {formatDate(program.deadline, "UTC", "MMM D, YYYY")}
        </Badge>
      )}
    </div>
  );
}
