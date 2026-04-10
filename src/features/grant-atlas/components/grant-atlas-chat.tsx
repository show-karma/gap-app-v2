"use client";

import { Globe, Loader2, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
import { usePhilanthropySearch } from "../hooks/use-philanthropy-stream";
import { useGrantAtlasStore } from "../store/philanthropy-chat";
import { RankedEntityCard } from "./ranked-entity-card";
import { SuggestedQueries } from "./suggested-queries";

export function GrantAtlasSearch() {
  const { query, narrative, result, isSearching, error } = useGrantAtlasStore();
  const { search } = usePhilanthropySearch();
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text || isSearching) return;
      search(text);
    },
    [inputValue, isSearching, search]
  );

  const handleSuggestionSelect = useCallback(
    (q: string) => {
      setInputValue(q);
      search(q);
    },
    [search]
  );

  const hasResults = Boolean(query);
  const currentPage = result?.pagination.page ?? 1;
  const totalCount = result?.pagination.totalCount ?? 0;
  const rangeStart =
    result && result.pagination.returned > 0
      ? (result.pagination.page - 1) * result.pagination.limit + 1
      : 0;
  const rangeEnd =
    result && result.pagination.returned > 0 ? rangeStart + result.pagination.returned - 1 : 0;

  return (
    <div className={`flex flex-col ${hasResults ? "" : "min-h-[calc(100vh-4rem)]"}`}>
      {/* Search header — always visible */}
      <div
        className={`flex flex-col items-center gap-6 px-4 ${
          hasResults ? "pb-6 pt-8" : "flex-1 justify-center pb-8"
        }`}
      >
        {!hasResults && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
              <Globe className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Grant Atlas</h1>
            <p className="max-w-md text-center text-sm text-zinc-500">
              Search foundations, nonprofits, and grants using natural language. Powered by IRS
              990PF data.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search philanthropy data..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-11 pr-24 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-600 dark:focus:ring-blue-900/40"
            />
            <button
              type="submit"
              disabled={isSearching || !inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : "Search"}
            </button>
          </div>
        </form>

        {!hasResults && (
          <div className="w-full max-w-2xl">
            <SuggestedQueries onSelect={handleSuggestionSelect} />
          </div>
        )}
      </div>

      {/* Results area */}
      {hasResults && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-12">
          {/* Query echo */}
          <div className="mb-6 border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <p className="text-xs text-zinc-400">Results for</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{query}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Narrative answer */}
          {(narrative || (isSearching && !result)) && (
            <div className="mb-8">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Answer
              </h2>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {narrative ? (
                  <MessageResponse>{narrative}</MessageResponse>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Entity results */}
          {result && result.entities.length > 0 && (
            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <span className="capitalize">{result.intent.targetEntityType}</span>
                  {totalCount !== 1 ? "s" : ""} results
                </h2>
                <span className="text-xs text-zinc-400">
                  Showing {rangeStart}-{rangeEnd} of {totalCount}
                </span>
              </div>
              <div className="grid gap-3">
                {result.entities.map((entity, i) => (
                  <RankedEntityCard key={entity.id} entity={entity} rank={i + 1} />
                ))}
              </div>
              {(result.pagination.hasPreviousPage || result.pagination.hasNextPage) && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => search(query, currentPage - 1)}
                    disabled={!result.pagination.hasPreviousPage || isSearching}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-zinc-500">Page {result.pagination.page}</span>
                  <button
                    type="button"
                    onClick={() => search(query, currentPage + 1)}
                    disabled={!result.pagination.hasNextPage || isSearching}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {result && result.entities.length === 0 && !isSearching && !narrative && (
            <p className="text-sm text-zinc-500">No results found. Try a different search.</p>
          )}

          {/* Loading skeleton for entities */}
          {isSearching && !result && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
