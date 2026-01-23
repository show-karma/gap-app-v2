"use client";

import { useSearchParams } from "next/navigation";
import { AddImpactScreen } from "@/components/Pages/Project/Impact/AddImpactScreen";
import { OutputsAndOutcomes } from "@/components/Pages/Project/Impact/OutputsAndOutcomes";
import { useOwnerStore, useProjectStore } from "@/store";
import { ImpactStatsSummary } from "./ImpactStatsSummary";

interface ImpactContentProps {
  className?: string;
}

/**
 * ImpactContent renders the project's outputs and outcomes data.
 * This component wraps the existing OutputsAndOutcomes component
 * for use within the new v2 project profile layout.
 *
 * Features:
 * - Summary stats cards (Total Transactions, Git Commits, Unique Users - last 30 days)
 * - Displays project impact metrics and historical data
 * - Supports editing for authorized users (owners/admins)
 * - Shows AddImpactScreen when ?tab=add-impact is present
 *
 * Note: Project Activity chart is now displayed in the ProjectHeader component
 * alongside the project info, separated by a vertical divider.
 */
export function ImpactContent({ className }: ImpactContentProps) {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isAuthorized = isOwner || isProjectAdmin;

  const searchParams = useSearchParams();
  const grantScreen = searchParams?.get("tab");

  // Show add impact form if authorized and tab=add-impact
  if (grantScreen === "add-impact" && isAuthorized) {
    return (
      <div className={className} data-testid="impact-content-add">
        <AddImpactScreen />
      </div>
    );
  }

  return (
    <section className={className} data-testid="impact-content">
      {/* Section 1: Stats Summary - Total Transactions, Git Commits, Unique Users (last 30 days) */}
      <ImpactStatsSummary className="mb-8" />

      {/* Section 2: Outputs and Outcomes */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black dark:text-white">Outputs and Outcomes</h2>
      </div>
      <div className="flex flex-col gap-4">
        <OutputsAndOutcomes />
      </div>
    </section>
  );
}
