"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { DeleteDialog } from "@/components/DeleteDialog";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  useCreateReportConfig,
  useDeleteReportConfig,
  useReportConfigs,
  useUpdateReportConfig,
} from "@/hooks/portfolio-reports/usePortfolioReports";
import type { ReportConfig } from "@/types/portfolio-report";
import type { Community } from "@/types/v2/community";
import { PAGES } from "@/utilities/pages";
import { formatScheduleLabel } from "@/utilities/portfolio-reports/period";

interface Props {
  community: Community;
  grantPrograms: GrantProgram[];
}

const AVAILABLE_MODELS = [
  { id: "gpt-5.2", label: "GPT-5.2 (OpenAI)" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 Nano (OpenAI)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Anthropic)" },
  { id: "grok-4-1-fast-reasoning", label: "Grok 4.1 (xAI)" },
];

const MODEL_IDS = AVAILABLE_MODELS.map((m) => m.id) as [string, ...string[]];

// Days 1..28 — capped at 28 so the cron always fires (29/30/31 would skip
// February and 30-day months).
const DAYS_OF_MONTH: number[] = Array.from({ length: 28 }, (_, i) => i + 1);

const PROMPT_PLACEHOLDER = `Example: Generate a markdown portfolio report covering the last 30 days of activity (please always specify a date range — the agent defaults to the last 30 days when none is given).

Sections:
1. Executive Summary (2-3 paragraphs)
2. Portfolio Snapshot (counts, totals)
3. Progress and Milestones
4. Spotlight: 1-2 standout grantee stories
5. Ecosystem Alignment

Use markdown formatting with headers, tables, and bold text.`;

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(128),
  programIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one program"),
  modelId: z.enum(MODEL_IDS, { message: "Pick a model" }),
  prompt: z.string().trim().min(1, "A prompt is required"),
  daysOfMonth: z
    .array(z.number().int().min(1).max(28))
    .min(1, "Pick at least one day of month")
    .max(28),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY_FORM_VALUES: FormValues = {
  name: "",
  programIds: [],
  modelId: AVAILABLE_MODELS[0].id,
  prompt: "",
  daysOfMonth: [1],
  isActive: true,
};

interface ProgramOption {
  programId: string;
  label: string;
}

function buildProgramOptions(grantPrograms: GrantProgram[]): ProgramOption[] {
  const options: ProgramOption[] = [];
  for (const program of grantPrograms) {
    const programId = (program as { programId?: string }).programId;
    if (typeof programId !== "string" || programId.length === 0) continue;
    const title = program.metadata?.title?.trim();
    options.push({
      programId,
      label: title ? `${title} (${programId})` : programId,
    });
  }
  // Stable sort by label so the dropdown order is deterministic across renders.
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function ReportConfigPage({ community, grantPrograms }: Props) {
  const slug = community.details.slug;
  const router = useRouter();
  const { hasAccess, isLoading: accessLoading } = useCommunityAdminAccess(community.uid);
  const {
    data: configs,
    isLoading,
    isError: configsError,
    refetch: refetchConfigs,
  } = useReportConfigs(slug);

  const programOptions = useMemo(
    () => buildProgramOptions(grantPrograms),
    [grantPrograms]
  );
  const labelByProgramId = useMemo(
    () => new Map(programOptions.map((o) => [o.programId, o.label])),
    [programOptions]
  );
  const programIdByLabel = useMemo(
    () => new Map(programOptions.map((o) => [o.label, o.programId])),
    [programOptions]
  );

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editingConfig = useMemo(
    () =>
      editingId && editingId !== "new"
        ? configs?.find((c) => c.id === editingId) ?? null
        : null,
    [configs, editingId]
  );

  const createMutation = useCreateReportConfig(slug);
  const updateMutation = useUpdateReportConfig(slug, editingConfig?.id ?? "");
  const deleteMutation = useDeleteReportConfig(slug);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const selectedProgramIds = watch("programIds");
  const selectedProgramLabels = selectedProgramIds
    .map((id) => labelByProgramId.get(id) ?? id);

  const selectedDays = watch("daysOfMonth");
  const toggleDay = (day: number) => {
    const current = selectedDays ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setValue("daysOfMonth", next, { shouldValidate: true, shouldDirty: true });
  };

  // Sync the form whenever we switch which config we're editing.
  useEffect(() => {
    if (!editingId) return;
    if (editingId === "new") {
      reset(EMPTY_FORM_VALUES);
    } else if (editingConfig) {
      reset({
        name: editingConfig.name,
        programIds: editingConfig.programIds,
        modelId: editingConfig.modelId,
        prompt: editingConfig.prompt,
        daysOfMonth: [...editingConfig.daysOfMonth].sort((a, b) => a - b),
        isActive: editingConfig.isActive,
      });
    }
  }, [editingId, editingConfig, reset]);

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

  const handleSelectProgram = (label: string) => {
    const programId = programIdByLabel.get(label);
    if (!programId) return;
    const current = selectedProgramIds;
    const next = current.includes(programId)
      ? current.filter((id) => id !== programId)
      : [...current, programId];
    setValue("programIds", next, { shouldValidate: true, shouldDirty: true });
  };

  const handleClearPrograms = () => {
    setValue("programIds", [], { shouldValidate: true, shouldDirty: true });
  };

  const onInvalid = (formErrors: typeof errors) => {
    if (formErrors.name?.message) toast.error(formErrors.name.message);
    if (formErrors.programIds?.message) toast.error(formErrors.programIds.message);
    if (formErrors.prompt?.message) toast.error(formErrors.prompt.message);
    if (formErrors.modelId?.message) toast.error(formErrors.modelId.message);
    if (formErrors.daysOfMonth?.message) toast.error(formErrors.daysOfMonth.message);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editingId === "new") {
        await createMutation.mutateAsync(values);
        toast.success("Config created");
      } else {
        // Don't fall back to create when the editing config has gone missing
        // (deleted in another tab, refetched as empty, etc.) — that would
        // silently spawn a duplicate row.
        if (!editingConfig) {
          toast.error(
            "This config no longer exists. Please refresh and try again."
          );
          return;
        }
        await updateMutation.mutateAsync(values);
        toast.success("Config updated");
      }
      setEditingId(null);
    } catch (error) {
      toast.error(
        `Failed to save config: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success("Config deactivated");
      if (editingId === deletingId) setEditingId(null);
    } catch (error) {
      toast.error(
        `Failed to delete config: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setDeletingId(null);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending || isSubmitting;
  const isFormOpen = editingId !== null;
  const formTitle = editingId === "new"
    ? "New Report"
    : editingConfig?.name
      ? `Edit "${editingConfig.name}"`
      : "Edit Report";

  return (
    <div className="space-y-6">
      <DeleteDialog
        title="Deactivate this report config?"
        deleteFunction={handleDelete}
        isLoading={deleteMutation.isPending}
        externalIsOpen={deletingId !== null}
        externalSetIsOpen={(open) => {
          if (!open) setDeletingId(null);
        }}
        buttonElement={null}
      />

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(PAGES.ADMIN.PORTFOLIO_REPORTS(slug))}
          aria-label="Back to portfolio reports"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Report Configurations
          </h1>
          <p className="text-sm text-zinc-500">
            Define one or more reports per community. Each runs once per month on its scheduled day.
          </p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setEditingId("new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Button>
        )}
      </div>

      {/* Configs table */}
      {configsError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 p-12 text-center dark:border-red-900/40">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load report configs.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => refetchConfigs()}
          >
            Retry
          </Button>
        </div>
      ) : !configs || configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-600">
          <p className="text-sm text-zinc-500">
            No report configs yet. Click &quot;New Report&quot; to create the first one.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Schedule</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Programs</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Model</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Active</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {configs.map((cfg: ReportConfig) => (
                <tr key={cfg.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {cfg.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {formatScheduleLabel(cfg.daysOfMonth)}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {cfg.programIds.length} program{cfg.programIds.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{cfg.modelId}</td>
                  <td className="px-4 py-3">
                    {cfg.isActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(cfg.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(cfg.id)}
                        aria-label={`Deactivate ${cfg.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {formTitle}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setEditingId(null)}
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Report name
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Monthly TVL Recap"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              {...register("name")}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Programs */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Programs
            </label>
            <SearchDropdown
              list={programOptions.map((o) => o.label)}
              selected={selectedProgramLabels}
              onSelectFunction={handleSelectProgram}
              cleanFunction={handleClearPrograms}
              prefixUnselected="Select programs"
              type="Programs"
              showCount
            />
            <p className="mt-1 text-xs text-zinc-400">
              Pick the grant programs the report should cover. The agent only sees data from these.
            </p>
            {errors.programIds && (
              <p className="mt-1 text-xs text-red-500">{errors.programIds.message}</p>
            )}
          </div>

          {/* Model */}
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
          </div>

          {/* Days of month */}
          <div>
            <fieldset>
              <legend className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Days of month to run
              </legend>
              <p className="mb-2 text-xs text-zinc-400">
                Pick one or more days. The cron fires on each selected day
                every month (e.g. <code>1, 15</code> = twice a month). Capped
                at 28 so February doesn&apos;t skip.
              </p>
              <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
                {DAYS_OF_MONTH.map((day) => {
                  const checked = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`Day ${day}`}
                      onClick={() => toggleDay(day)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        checked
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200"
                          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Schedule: <strong>{formatScheduleLabel(selectedDays)}</strong>
              </p>
            </fieldset>
            {errors.daysOfMonth && (
              <p className="mt-1 text-xs text-red-500">
                {errors.daysOfMonth.message}
              </p>
            )}
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              className="rounded border-zinc-300"
              {...register("isActive")}
            />
            <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">
              Active (auto-generate on the scheduled day)
            </label>
          </div>

          {/* Prompt */}
          <div>
            <label
              htmlFor="prompt"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Report Prompt
            </label>
            <p className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <strong>Tip:</strong> specify the time window in your prompt
              (e.g. &quot;summarize the last 30 days&quot; or &quot;past quarter&quot;).
              If you don&apos;t, the agent defaults to the last 30 days.
            </p>
            <textarea
              id="prompt"
              rows={12}
              placeholder={PROMPT_PLACEHOLDER}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              {...register("prompt")}
            />
            {errors.prompt && (
              <p className="mt-1 text-xs text-red-500">{errors.prompt.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setEditingId(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : editingId === "new" ? "Create Report" : "Save Changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
