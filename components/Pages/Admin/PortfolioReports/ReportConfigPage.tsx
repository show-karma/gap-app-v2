"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  useReportConfigs,
  useCreateReportConfig,
  useUpdateReportConfig,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { Spinner } from "@/components/Utilities/Spinner";

interface Props {
  community: Community;
}

const AVAILABLE_MODELS = [
  { id: "gpt-5.2", label: "GPT-5.2 (OpenAI)" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 Nano (OpenAI)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Anthropic)" },
  { id: "grok-4-1-fast-reasoning", label: "Grok 4.1 (xAI)" },
];

export function ReportConfigPage({ community }: Props) {
  const slug = community.details.slug;
  const router = useRouter();
  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const { data: configs, isLoading } = useReportConfigs(slug);
  const createMutation = useCreateReportConfig(slug);

  const existingConfig = configs?.[0];

  const [programIds, setProgramIds] = useState("");
  const [modelId, setModelId] = useState(AVAILABLE_MODELS[0].id);
  const [prompt, setPrompt] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (existingConfig) {
      setProgramIds(existingConfig.programIds.join(", "));
      setModelId(existingConfig.modelId);
      setPrompt(existingConfig.prompt);
      setIsActive(existingConfig.isActive);
    }
  }, [existingConfig]);

  const updateMutation = useUpdateReportConfig(
    slug,
    existingConfig?.id ?? ""
  );

  if (accessLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500">
        You don&apos;t have permission to view this page.
      </div>
    );
  }

  const handleSave = async () => {
    const parsedProgramIds = programIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (parsedProgramIds.length === 0) {
      toast.error("At least one program ID is required");
      return;
    }

    if (!prompt.trim()) {
      toast.error("A prompt is required");
      return;
    }

    try {
      if (existingConfig) {
        await updateMutation.mutateAsync({
          programIds: parsedProgramIds,
          modelId,
          prompt,
          isActive,
        });
        toast.success("Config updated");
      } else {
        await createMutation.mutateAsync({
          programIds: parsedProgramIds,
          modelId,
          prompt,
        });
        toast.success("Config created");
      }
    } catch (error) {
      toast.error(`Failed to save config: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(PAGES.ADMIN.PORTFOLIO_REPORTS(slug))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Report Configuration
          </h1>
          <p className="text-sm text-zinc-500">
            Configure which programs, model, and prompt to use for report generation
          </p>
        </div>
      </div>

      <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        {/* Program IDs */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Program IDs
          </label>
          <input
            type="text"
            value={programIds}
            onChange={(e) => setProgramIds(e.target.value)}
            placeholder="program-1, program-2"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-400">Comma-separated list of program IDs to include in the report</p>
        </div>

        {/* Model selector */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            LLM Model
          </label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-zinc-300"
          />
          <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">
            Active (auto-generate monthly)
          </label>
        </div>

        {/* Single prompt */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Report Prompt
          </label>
          <p className="mb-2 text-xs text-zinc-400">
            This prompt is sent as the system message to the LLM. The structured portfolio data (projects, milestones, OSO metrics, financials) is sent as the user message in JSON format. The LLM should generate the full report as markdown.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            placeholder={`Example: You are generating a monthly portfolio report for a grant program. The data provided contains per-project milestones, OSO metrics (TVL, transaction fees), and financial data.\n\nGenerate a comprehensive markdown report with:\n1. Executive Summary (2-3 paragraphs)\n2. Portfolio Snapshot (table of batch-level stats)\n3. Progress and Milestones (per-batch breakdown)\n4. Spotlight: 1-2 standout grantee stories\n5. Ecosystem Alignment\n\nUse markdown formatting with headers, tables, and bold text.`}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : existingConfig
                ? "Update Config"
                : "Create Config"}
          </Button>
        </div>
      </div>
    </div>
  );
}
