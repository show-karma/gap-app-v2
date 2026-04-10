"use client";

import { Lightbulb, Search, TrendingUp, Users } from "lucide-react";

const suggestions = [
  {
    icon: TrendingUp,
    label: "Who are the largest education funders?",
  },
  {
    icon: Search,
    label: "Find foundations funding climate change research",
  },
  {
    icon: Users,
    label: "Nonprofits receiving healthcare grants in California",
  },
  {
    icon: Lightbulb,
    label: "Emerging trends in arts and culture philanthropy",
  },
];

interface SuggestedQueriesProps {
  onSelect: (query: string) => void;
}

export function SuggestedQueries({ onSelect }: SuggestedQueriesProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.label}
          type="button"
          onClick={() => onSelect(suggestion.label)}
          className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-left text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/80"
        >
          <suggestion.icon className="mt-0.5 size-4 shrink-0 text-zinc-400" />
          <span>{suggestion.label}</span>
        </button>
      ))}
    </div>
  );
}
