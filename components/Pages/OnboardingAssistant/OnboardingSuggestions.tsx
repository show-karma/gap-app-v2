"use client";

import { DocumentTextIcon, GlobeAltIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utilities/tailwind";

interface OnboardingSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  disabled?: boolean;
}

const suggestions = [
  {
    title: "Start from scratch",
    description: "I'll guide you through creating a project profile step by step",
    icon: SparklesIcon,
    query: "I want to create a new project profile from scratch. Can you help me?",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    title: "Import from URL",
    description: "Paste your website or proposal URL and I'll extract the details",
    icon: GlobeAltIcon,
    query: "I have a website/proposal URL that describes my project. Let me share it with you.",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    title: "Document grants",
    description: "Add grants you've received and track milestones",
    icon: DocumentTextIcon,
    query: "I already have a project and want to document grants and milestones I've received.",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
  },
] as const;

export function OnboardingSuggestions({
  onSuggestionClick,
  disabled = false,
}: OnboardingSuggestionsProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          How would you like to get started?
        </h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Choose an option or type your own message below
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              type="button"
              key={suggestion.title}
              onClick={() => onSuggestionClick(suggestion.query)}
              disabled={disabled}
              className={cn(
                "rounded-lg p-4 transition-colors flex items-start gap-3 text-left w-full border border-gray-200 dark:border-zinc-700",
                suggestion.bgColor,
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"
              )}
              aria-label={suggestion.title}
            >
              <Icon className="h-5 w-5 text-gray-600 dark:text-zinc-300 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {suggestion.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                  {suggestion.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
