"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  useCreateReportConfig,
  useReportConfigs,
  useUpdateReportConfig,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";

interface Props {
  community: Community;
}

const AVAILABLE_MODELS = [
  { id: "gpt-5.2", label: "GPT-5.2 (OpenAI)" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 Nano (OpenAI)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Anthropic)" },
  { id: "grok-4-1-fast-reasoning", label: "Grok 4.1 (xAI)" },
];

const MODEL_IDS = AVAILABLE_MODELS.map((m) => m.id) as [string, ...string[]];

const formSchema = z.object({
  programIds: z
    .string()
    .trim()
    .min(1, "At least one program ID is required")
    .refine(
      (s) =>
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean).length > 0,
      { message: "At least one program ID is required" }
    ),
  modelId: z.enum(MODEL_IDS, { message: "Pick a model" }),
  prompt: z.string().trim().min(1, "A prompt is required"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function ReportConfigPage({ community }: Props) {
  const slug = community.details.slug;
  const router = useRouter();
  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const { data: configs, isLoading } = useReportConfigs(slug);
  const createMutation = useCreateReportConfig(slug);

  const existingConfig = configs?.[0];
  const updateMutation = useUpdateReportConfig(slug, existingConfig?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      programIds: "",
      modelId: AVAILABLE_MODELS[0].id,
      prompt: "",
      isActive: true,
    },
  });

  // Sync form with the loaded config (once it lands).
  useEffect(() => {
    if (!existingConfig) return;
    reset({
      programIds: existingConfig.programIds.join(", "),
      modelId: existingConfig.modelId,
      prompt: existingConfig.prompt,
      isActive: existingConfig.isActive,
    });
  }, [existingConfig, reset]);

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

  // Show validation toasts for any failing field.
  const onInvalid = (formErrors: typeof errors) => {
    if (formErrors.programIds?.message) toast.error(formErrors.programIds.message);
    if (formErrors.prompt?.message) toast.error(formErrors.prompt.message);
    if (formErrors.modelId?.message) toast.error(formErrors.modelId.message);
  };

  const onSubmit = async (values: FormValues) => {
    const parsedProgramIds = values.programIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    try {
      if (existingConfig) {
        await updateMutation.mutateAsync({
          programIds: parsedProgramIds,
          modelId: values.modelId,
          prompt: values.prompt,
          isActive: values.isActive,
        });
        toast.success("Config updated");
      } else {
        await createMutation.mutateAsync({
          programIds: parsedProgramIds,
          modelId: values.modelId,
          prompt: values.prompt,
          isActive: values.isActive,
        });
        toast.success("Config created");
      }
    } catch (error) {
      toast.error(
        `Failed to save config: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending || isSubmitting;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(PAGES.ADMIN.PORTFOLIO_REPORTS(slug))}
          aria-label="Back to portfolio reports"
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

      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
      >
        {/* Program IDs */}
        <div>
          <label
            htmlFor="programIds"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Program IDs
          </label>
          <input
            id="programIds"
            type="text"
            placeholder="program-1, program-2"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            {...register("programIds")}
          />
          <p className="mt-1 text-xs text-zinc-400">
            Comma-separated list of program IDs to include in the report
          </p>
          {errors.programIds && (
            <p className="mt-1 text-xs text-red-500">{errors.programIds.message}</p>
          )}
        </div>

        {/* Model selector */}
        <div>
          <label
            htmlFor="modelId"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            LLM Model
          </label>
          <select
            id="modelId"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            {...register("modelId")}
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {errors.modelId && <p className="mt-1 text-xs text-red-500">{errors.modelId.message}</p>}
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            className="rounded border-zinc-300"
            {...register("isActive")}
          />
          <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">
            Active (auto-generate monthly)
          </label>
        </div>

        {/* Single prompt */}
        <div>
          <label
            htmlFor="prompt"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Report Prompt
          </label>
          <p className="mb-2 text-xs text-zinc-400">
            This prompt is sent as the system message to the LLM. The structured portfolio data
            (projects, milestones, OSO metrics, financials) is sent as the user message in JSON
            format. The LLM should generate the full report as markdown.
          </p>
          <textarea
            id="prompt"
            rows={12}
            placeholder={`Example: You are generating a monthly portfolio report for a grant program. The data provided contains per-project milestones, OSO metrics (TVL, transaction fees), and financial data.\n\nGenerate a comprehensive markdown report with:\n1. Executive Summary (2-3 paragraphs)\n2. Portfolio Snapshot (table of batch-level stats)\n3. Progress and Milestones (per-batch breakdown)\n4. Spotlight: 1-2 standout grantee stories\n5. Ecosystem Alignment\n\nUse markdown formatting with headers, tables, and bold text.`}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            {...register("prompt")}
          />
          {errors.prompt && <p className="mt-1 text-xs text-red-500">{errors.prompt.message}</p>}
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : existingConfig ? "Update Config" : "Create Config"}
          </Button>
        </div>
      </form>
    </div>
  );
}
