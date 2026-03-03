"use client";

import { Badge } from "@/components/ui/badge";
import formatCurrency from "@/utilities/formatCurrency";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import type { FundingProgramResponse, OpportunityType } from "../types/funding-program";

interface DialogTypeSectionProps {
  program: FundingProgramResponse;
}

export function DialogTypeSection({ program }: DialogTypeSectionProps) {
  const type: OpportunityType = program.type ?? "grant";

  switch (type) {
    case "hackathon":
      return <HackathonSection program={program} />;
    case "bounty":
      return <BountySection program={program} />;
    case "accelerator":
      return <AcceleratorSection program={program} />;
    case "vc_fund":
      return <VcFundSection program={program} />;
    case "rfp":
      return <RfpSection program={program} />;
    default:
      return null;
  }
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-4 py-2 border-b border-border">
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function HackathonSection({ program }: { program: FundingProgramResponse }) {
  const meta = program.hackathonMetadata;
  if (!meta) return null;

  const totalPrizePool = meta.prizes?.reduce((sum, p) => {
    const amount = typeof p.amount === "string" ? Number(p.amount) : p.amount;
    return sum + (Number.isNaN(amount) ? 0 : amount);
  }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SectionCard label="Hackathon Details">
        <DetailRow label="Location" value={meta.location} />
        <DetailRow
          label="Dates"
          value={
            meta.startDate && meta.endDate
              ? `${formatDate(meta.startDate, "UTC", "MMM D, YYYY")} - ${formatDate(meta.endDate, "UTC", "MMM D, YYYY")}`
              : null
          }
        />
        <DetailRow
          label="Registration Deadline"
          value={
            meta.registrationDeadline
              ? formatDate(meta.registrationDeadline, "UTC", "MMM D, YYYY")
              : null
          }
        />
        <DetailRow
          label="Team Size"
          value={meta.teamSize ? `${meta.teamSize.min} - ${meta.teamSize.max}` : null}
        />
        {totalPrizePool !== undefined && totalPrizePool > 0 && (
          <DetailRow label="Total Prize Pool" value={`$${formatCurrency(totalPrizePool)}`} />
        )}
      </SectionCard>

      {meta.tracks && meta.tracks.length > 0 && (
        <SectionCard label="Tracks">
          <div className="flex flex-wrap gap-1.5">
            {meta.tracks.map((track) => (
              <Badge key={track} variant="outline" className="rounded-full text-xs font-normal">
                {track}
              </Badge>
            ))}
          </div>
        </SectionCard>
      )}

      {meta.prizes && meta.prizes.length > 0 && (
        <SectionCard label="Prizes">
          {meta.prizes.map((prize, idx) => (
            <DetailRow
              key={prize.track ?? idx}
              label={prize.track ?? `Prize ${idx + 1}`}
              value={`${prize.currency === "USD" ? "$" : ""}${formatCurrency(Number(prize.amount))}${prize.currency !== "USD" ? ` ${prize.currency}` : ""}`}
            />
          ))}
        </SectionCard>
      )}
    </div>
  );
}

function BountySection({ program }: { program: FundingProgramResponse }) {
  const meta = program.bountyMetadata;
  if (!meta) return null;

  const rewardAmount =
    typeof meta.reward.amount === "string" ? Number(meta.reward.amount) : meta.reward.amount;

  return (
    <SectionCard label="Bounty Details">
      {!Number.isNaN(rewardAmount) && rewardAmount > 0 && (
        <DetailRow
          label="Reward"
          value={`${meta.reward.currency === "USD" ? "$" : ""}${formatCurrency(rewardAmount)}${meta.reward.currency !== "USD" ? ` ${meta.reward.currency}` : ""}`}
        />
      )}
      {meta.difficulty && (
        <DetailRow
          label="Difficulty"
          value={
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
          }
        />
      )}
      {meta.platform && <DetailRow label="Platform" value={meta.platform} />}
      {meta.skills && meta.skills.length > 0 && (
        <div className="pt-1">
          <span className="text-sm text-muted-foreground">Skills</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {meta.skills.map((skill) => (
              <Badge key={skill} variant="outline" className="rounded-full text-xs font-normal">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function AcceleratorSection({ program }: { program: FundingProgramResponse }) {
  const meta = program.acceleratorMetadata;
  if (!meta) return null;

  return (
    <SectionCard label="Accelerator Details">
      {meta.stage && (
        <DetailRow label="Stage" value={<span className="capitalize">{meta.stage}</span>} />
      )}
      {meta.equity && <DetailRow label="Equity" value={meta.equity} />}
      {meta.funding && !Number.isNaN(Number(meta.funding.amount)) && (
        <DetailRow label="Funding" value={`$${formatCurrency(Number(meta.funding.amount))}`} />
      )}
      {meta.programDuration && (
        <DetailRow
          label="Duration"
          value={`${meta.programDuration} ${meta.programDuration === 1 ? "month" : "months"}`}
        />
      )}
      {meta.batchSize && (
        <DetailRow
          label="Batch Size"
          value={`${meta.batchSize} ${meta.batchSize === 1 ? "company" : "companies"}`}
        />
      )}
      {meta.location && <DetailRow label="Location" value={meta.location} />}
      {meta.applicationDeadline && (
        <DetailRow
          label="Application Deadline"
          value={formatDate(meta.applicationDeadline, "UTC", "MMM D, YYYY")}
        />
      )}
    </SectionCard>
  );
}

function VcFundSection({ program }: { program: FundingProgramResponse }) {
  const meta = program.vcFundMetadata;
  if (!meta) return null;

  return (
    <SectionCard label="VC Fund Details">
      {meta.stage && (
        <DetailRow label="Stage" value={<span className="capitalize">{meta.stage}</span>} />
      )}
      {meta.checkSize && (
        <DetailRow
          label="Check Size"
          value={`$${formatCurrency(meta.checkSize.min)} - $${formatCurrency(meta.checkSize.max)}`}
        />
      )}
      {meta.thesis && <DetailRow label="Thesis" value={meta.thesis} />}
      {meta.contactMethod && (
        <DetailRow
          label="Contact"
          value={<span className="capitalize">{meta.contactMethod.replace("-", " ")}</span>}
        />
      )}
      {meta.activelyInvesting !== undefined && (
        <DetailRow
          label="Status"
          value={meta.activelyInvesting ? "Actively Investing" : "Not Currently Investing"}
        />
      )}
      {meta.portfolio && meta.portfolio.length > 0 && (
        <div className="pt-1">
          <span className="text-sm text-muted-foreground">Portfolio</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {meta.portfolio.map((company) => (
              <Badge key={company} variant="outline" className="rounded-full text-xs font-normal">
                {company}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function RfpSection({ program }: { program: FundingProgramResponse }) {
  const meta = program.rfpMetadata;
  if (!meta) return null;

  return (
    <SectionCard label="RFP Details">
      <DetailRow label="Issuing Organization" value={meta.issuingOrganization} />
      {meta.budget && !Number.isNaN(Number(meta.budget.amount)) && (
        <DetailRow label="Budget" value={`$${formatCurrency(Number(meta.budget.amount))}`} />
      )}
      {meta.scope && <DetailRow label="Scope" value={meta.scope} />}
      {program.deadline && (
        <DetailRow label="Deadline" value={formatDate(program.deadline, "UTC", "MMM D, YYYY")} />
      )}
      {meta.requirements && meta.requirements.length > 0 && (
        <div className="pt-1">
          <span className="text-sm text-muted-foreground">Requirements</span>
          <ul className="mt-1.5 space-y-1">
            {meta.requirements.map((req) => (
              <li key={req} className="text-sm text-foreground flex items-start gap-1.5">
                <span className="text-muted-foreground mt-1">-</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
