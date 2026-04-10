"use client";

import { ArrowLeft, Building2, Landmark, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGES } from "@/utilities/pages";
import {
  useFoundation,
  useFoundationFinancials,
  useFoundationGrants,
  useFoundationOfficers,
} from "../hooks/use-foundation";
import type { Financials, Grant, Officer } from "../types/philanthropy";

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function GrantsTable({ grants }: { grants: Grant[] }) {
  if (grants.length === 0) {
    return <p className="text-sm text-zinc-500">No grants found.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase text-zinc-500 dark:border-zinc-800">
            <th className="pb-2 pr-4">Recipient / Purpose</th>
            <th className="pb-2 pr-4">Amount</th>
            <th className="pb-2 pr-4">Year</th>
          </tr>
        </thead>
        <tbody>
          {grants.map((grant) => (
            <tr key={grant.id} className="border-b border-zinc-100 dark:border-zinc-800/50">
              <td className="py-3 pr-4">
                <Link
                  href={PAGES.GRANT_ATLAS.GRANT(grant.id)}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {grant.purposeText || "No purpose listed"}
                </Link>
              </td>
              <td className="py-3 pr-4 tabular-nums">{formatCurrency(grant.amount)}</td>
              <td className="py-3 pr-4">{grant.filingYear}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OfficersTable({ officers }: { officers: Officer[] }) {
  if (officers.length === 0) {
    return <p className="text-sm text-zinc-500">No officers found.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase text-zinc-500 dark:border-zinc-800">
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Title</th>
            <th className="pb-2 pr-4">Compensation</th>
            <th className="pb-2 pr-4">Benefits</th>
            <th className="pb-2 pr-4">Year</th>
          </tr>
        </thead>
        <tbody>
          {officers.map((officer) => (
            <tr key={officer.id} className="border-b border-zinc-100 dark:border-zinc-800/50">
              <td className="py-3 pr-4 font-medium">{officer.name}</td>
              <td className="py-3 pr-4">{officer.title || "—"}</td>
              <td className="py-3 pr-4 tabular-nums">{formatCurrency(officer.compensation)}</td>
              <td className="py-3 pr-4 tabular-nums">{formatCurrency(officer.benefits)}</td>
              <td className="py-3 pr-4">{officer.filingYear}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinancialsTable({ financials }: { financials: Financials[] }) {
  if (financials.length === 0) {
    return <p className="text-sm text-zinc-500">No financial data found.</p>;
  }

  const sorted = [...financials].sort((a, b) => b.filingYear - a.filingYear);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase text-zinc-500 dark:border-zinc-800">
            <th className="pb-2 pr-4">Year</th>
            <th className="pb-2 pr-4">Revenue</th>
            <th className="pb-2 pr-4">Expenses</th>
            <th className="pb-2 pr-4">Total Assets</th>
            <th className="pb-2 pr-4">Net Assets</th>
            <th className="pb-2 pr-4">Qualifying Dist.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((fin) => (
            <tr key={fin.id} className="border-b border-zinc-100 dark:border-zinc-800/50">
              <td className="py-3 pr-4 font-medium">{fin.filingYear}</td>
              <td className="py-3 pr-4 tabular-nums">{formatCurrency(fin.totalRevenue)}</td>
              <td className="py-3 pr-4 tabular-nums">{formatCurrency(fin.totalExpenses)}</td>
              <td className="py-3 pr-4 tabular-nums">{formatCurrency(fin.totalAssets)}</td>
              <td className="py-3 pr-4 tabular-nums">{formatCurrency(fin.netAssets)}</td>
              <td className="py-3 pr-4 tabular-nums">
                {formatCurrency(fin.qualifyingDistributions)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tabs = ["Grants", "Officers", "Financials"] as const;
type Tab = (typeof tabs)[number];

export function FoundationDetail({ id }: { id: string }) {
  const { data: foundation, isLoading } = useFoundation(id);
  const { data: grants, isLoading: grantsLoading } = useFoundationGrants(id);
  const { data: officers, isLoading: officersLoading } = useFoundationOfficers(id);
  const { data: financials, isLoading: financialsLoading } = useFoundationFinancials(id);

  const [activeTab, setActiveTab] = useState<Tab>("Grants");

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!foundation) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Foundation not found
        </h1>
        <Link
          href={PAGES.GRANT_ATLAS.ROOT}
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          Back to Grant Atlas
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href={PAGES.GRANT_ATLAS.ROOT}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        <ArrowLeft className="size-3.5" />
        Grant Atlas
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <Landmark className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {foundation.name}
            </h1>
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <span>EIN: {foundation.ein}</span>
              {foundation.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {foundation.location}
                </span>
              )}
            </div>
          </div>
        </div>
        {foundation.description && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{foundation.description}</p>
        )}
        {foundation.totalAssets != null && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
            <span className="text-xs text-zinc-500">Total Assets</span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(foundation.totalAssets)}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {tab}
              {tab === "Grants" && grants && (
                <span className="ml-1.5 text-xs text-zinc-400">({grants.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "Grants" &&
          (grantsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <GrantsTable grants={grants ?? []} />
          ))}
        {activeTab === "Officers" &&
          (officersLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <OfficersTable officers={officers ?? []} />
          ))}
        {activeTab === "Financials" &&
          (financialsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <FinancialsTable financials={financials ?? []} />
          ))}
      </div>
    </div>
  );
}
