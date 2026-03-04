import { Award, Briefcase, FileText, Landmark, Rocket, Trophy } from "lucide-react";
import type { OpportunityType } from "../types/funding-program";

interface OpportunityTypeConfig {
  label: string;
  singularLabel: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const CONFIG: Record<OpportunityType, OpportunityTypeConfig> = {
  grant: {
    label: "Grants",
    singularLabel: "Grant",
    icon: Landmark,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30",
    borderClass: "border-emerald-200 dark:border-emerald-800",
  },
  hackathon: {
    label: "Hackathons",
    singularLabel: "Hackathon",
    icon: Trophy,
    colorClass: "text-violet-600 dark:text-violet-400",
    bgClass: "bg-violet-50 dark:bg-violet-900/30",
    borderClass: "border-violet-200 dark:border-violet-800",
  },
  bounty: {
    label: "Bounties",
    singularLabel: "Bounty",
    icon: Award,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-900/30",
    borderClass: "border-amber-200 dark:border-amber-800",
  },
  accelerator: {
    label: "Accelerators",
    singularLabel: "Accelerator",
    icon: Rocket,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-900/30",
    borderClass: "border-blue-200 dark:border-blue-800",
  },
  vc_fund: {
    label: "VC Funds",
    singularLabel: "VC Fund",
    icon: Briefcase,
    colorClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-900/30",
    borderClass: "border-rose-200 dark:border-rose-800",
  },
  rfp: {
    label: "RFPs",
    singularLabel: "RFP",
    icon: FileText,
    colorClass: "text-cyan-600 dark:text-cyan-400",
    bgClass: "bg-cyan-50 dark:bg-cyan-900/30",
    borderClass: "border-cyan-200 dark:border-cyan-800",
  },
};

export function getOpportunityTypeConfig(type: OpportunityType): OpportunityTypeConfig {
  return CONFIG[type];
}
