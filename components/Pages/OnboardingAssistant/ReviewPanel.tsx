"use client";

import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { cn } from "@/utilities/tailwind";
import type { OnboardingData } from "./types";

interface ReviewPanelProps {
  data: OnboardingData;
  onEdit: () => void;
  onCreateProject: () => void;
}

function FieldRow({
  label,
  value,
  required = false,
}: {
  label: string;
  value?: string;
  required?: boolean;
}) {
  const hasValue = value && value.trim().length > 0;
  return (
    <div className="flex items-start gap-2 py-1.5">
      {hasValue ? (
        <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
      ) : (
        <ExclamationCircleIcon
          className={cn(
            "h-4 w-4 mt-0.5 shrink-0",
            required ? "text-red-500" : "text-gray-400 dark:text-zinc-500"
          )}
        />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
          {label}
          {required && !hasValue && <span className="text-red-500 ml-1">*required</span>}
        </span>
        {hasValue && <p className="text-sm text-gray-900 dark:text-zinc-100 truncate">{value}</p>}
      </div>
    </div>
  );
}

export function ReviewPanel({ data, onEdit, onCreateProject }: ReviewPanelProps) {
  const { project, grants } = data;

  const requiredFields = [
    { label: "Title", value: project.title },
    { label: "Description", value: project.description },
    { label: "Problem", value: project.problem },
    { label: "Solution", value: project.solution },
    { label: "Mission Summary", value: project.missionSummary },
  ];

  const allRequiredFilled = requiredFields.every((f) => f.value && f.value.trim().length > 0);

  const linkEntries = Object.entries(project.links || {}).filter(
    ([, val]) => val && val.trim().length > 0
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Project section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Project Details
          </h3>
          <div className="rounded-lg border border-gray-200 dark:border-zinc-700 p-3 space-y-1">
            {requiredFields.map((field) => (
              <FieldRow key={field.label} label={field.label} value={field.value} required />
            ))}
            <FieldRow label="Location of Impact" value={project.locationOfImpact} />
            <FieldRow label="Business Model" value={project.businessModel} />
            <FieldRow label="Stage" value={project.stageIn} />
            <FieldRow label="Money Raised" value={project.raisedMoney} />
            <FieldRow label="Path Forward" value={project.pathToTake} />
          </div>
        </section>

        {/* Links section */}
        {linkEntries.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Links</h3>
            <div className="rounded-lg border border-gray-200 dark:border-zinc-700 p-3 space-y-1">
              {linkEntries.map(([key, value]) => (
                <FieldRow
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={value}
                />
              ))}
            </div>
          </section>
        )}

        {/* Grants section */}
        {grants.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Grants ({grants.length})
            </h3>
            <div className="space-y-3">
              {grants.map((grant, index) => (
                <div
                  key={`grant-${index}`}
                  className="rounded-lg border border-gray-200 dark:border-zinc-700 p-3 space-y-1"
                >
                  <FieldRow label="Title" value={grant.title} required />
                  <FieldRow label="Amount" value={grant.amount} />
                  <FieldRow label="Community" value={grant.community} />
                  {grant.milestones.length > 0 && (
                    <div className="mt-2 pl-6">
                      <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                        Milestones ({grant.milestones.length})
                      </p>
                      {grant.milestones.map((ms, msIndex) => (
                        <div
                          key={`ms-${index}-${msIndex}`}
                          className="flex items-center gap-2 py-0.5"
                        >
                          <CheckCircleIcon className="h-3 w-3 text-green-500 shrink-0" />
                          <span className="text-xs text-gray-700 dark:text-zinc-300">
                            {ms.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Action buttons */}
      <div className="border-t border-gray-200 dark:border-zinc-700 p-4 space-y-2">
        {!allRequiredFilled && (
          <p className="text-xs text-red-600 dark:text-red-400 text-center">
            Some required fields are missing. Go back to chat to provide them.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-lg border border-gray-300 dark:border-zinc-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Back to Chat
          </button>
          <button
            type="button"
            onClick={onCreateProject}
            disabled={!allRequiredFilled}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
