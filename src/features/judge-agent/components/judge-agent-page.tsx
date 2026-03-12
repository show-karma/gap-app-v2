"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/src/components/ui/input";
import { useAllCommunitiesPrograms } from "@/src/features/programs/hooks/use-all-communities-programs";
import type { Application } from "@/types/whitelabel-entities";
import { cn } from "@/utilities/tailwind";
import { useJudgeSubmission } from "../hooks/use-judge-submission";
import { useProgramApplications } from "../hooks/use-program-applications";
import type { JudgeCriterion } from "../types";
import { DEFAULT_CRITERIA } from "../types";
import { ApplicationsTable, extractApplicationFields } from "./applications-table";
import { JudgeResults } from "./judge-results";
import { VideoPreview } from "./video-preview";

function parseCriteriaFromText(text: string): JudgeCriterion[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, i) => {
    const parts = line.split("-").map((p) => p.trim());
    const name = parts[0] || `Criterion ${i + 1}`;
    const description = parts.slice(1).join(" - ") || name;
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      description,
      weight: Math.round(100 / lines.length),
      maxScore: 10,
    };
  });
}

export function JudgeAgentPage() {
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedReferenceNumber, setSelectedReferenceNumber] = useState<string | null>(null);
  const [selectedApplicationData, setSelectedApplicationData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [criteriaText, setCriteriaText] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const { data: communities, isLoading: isLoadingPrograms } = useAllCommunitiesPrograms();

  const judgeMutation = useJudgeSubmission();

  const allPrograms = useMemo(() => {
    if (!communities) return [];
    return communities
      .flatMap((c, ci) =>
        c.programs.map((p, pi) => {
          const meta = p.metadata as Record<string, any>;
          const settings = p.applicationConfig?.formSchema?.settings as
            | { judgingCriteria?: JudgeCriterion[]; judgeAgentSystemPrompt?: string }
            | undefined;
          return {
            id: (p as any).uid || (p as any)._id?.$oid || `${c.communityId}-${ci}-${pi}`,
            name: `${c.communityName} - ${meta?.title || "Untitled"}`,
            communityName: c.communityName,
            programTitle: meta?.title || "Untitled",
            programId: p.programId,
            judgingCriteria: settings?.judgingCriteria,
            judgeAgentSystemPrompt: settings?.judgeAgentSystemPrompt,
          };
        })
      )
      .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
  }, [communities]);

  const selectedProgramData = useMemo(
    () => allPrograms.find((p) => p.id === selectedProgram),
    [allPrograms, selectedProgram]
  );

  const { data: applications, isLoading: isLoadingApplications } = useProgramApplications(
    selectedProgramData?.programId
  );

  const programCriteria = selectedProgramData?.judgingCriteria ?? null;

  const criteria = useMemo(() => {
    if (programCriteria && programCriteria.length > 0) return programCriteria;
    if (!criteriaText.trim()) return DEFAULT_CRITERIA;
    const parsed = parseCriteriaFromText(criteriaText);
    return parsed.length > 0 ? parsed : DEFAULT_CRITERIA;
  }, [criteriaText, programCriteria]);

  const canSubmit = videoUrl.trim() && projectName.trim();

  const handleProgramChange = useCallback(
    (value: string) => {
      setSelectedProgram(value);
      setSelectedApplicationId(null);
      setSelectedReferenceNumber(null);
      setSelectedApplicationData(null);
      judgeMutation.reset();
    },
    [judgeMutation]
  );

  const handleSelectApplication = useCallback(
    (app: Application) => {
      const fields = extractApplicationFields(app);
      setSelectedApplicationId(app.id);
      setSelectedReferenceNumber(app.referenceNumber || null);
      setSelectedApplicationData(app.applicationData || null);
      setProjectName(fields.projectName);
      setVideoUrl(fields.videoUrl || "");
      setRepoUrl(fields.repoUrl || "");
      judgeMutation.reset();
    },
    [judgeMutation]
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    judgeMutation.mutate({
      videoUrl: videoUrl.trim(),
      projectName: projectName.trim(),
      hackathonName: selectedProgramData?.communityName,
      hackathonDescription: selectedProgramData
        ? `Program: ${selectedProgramData.programTitle}`
        : undefined,
      repoUrl: repoUrl.trim() || undefined,
      criteria,
      systemPrompt: selectedProgramData?.judgeAgentSystemPrompt || undefined,
      referenceNumber: selectedReferenceNumber || undefined,
      applicationData: selectedApplicationData || undefined,
    });
  }, [
    canSubmit,
    videoUrl,
    projectName,
    repoUrl,
    selectedProgramData,
    criteria,
    selectedReferenceNumber,
    selectedApplicationData,
    judgeMutation,
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Karma Judge Agent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered hackathon submission evaluator. Analyze demo videos and get detailed scoring
          with evidence-based feedback.
        </p>
      </div>

      {/* Program Selector */}
      <div className="mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <span className="text-sm font-medium text-foreground mb-1.5 block">Program</span>
              <Select value={selectedProgram} onValueChange={handleProgramChange}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingPrograms
                        ? "Loading programs..."
                        : "Select a program to view applications"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {allPrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {programCriteria && programCriteria.length > 0 && (
              <span className="mt-5 inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                Custom criteria configured
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Active System Prompt (collapsible) */}
      {selectedProgramData?.judgeAgentSystemPrompt && (
        <div className="mb-6">
          <div className="rounded-lg border border-border bg-card">
            <button
              type="button"
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className="flex items-center justify-between w-full px-4 py-3 text-left"
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                  Custom
                </span>
                System Prompt Active
              </span>
              <span className="text-xs text-muted-foreground">
                {showSystemPrompt ? "Hide" : "Show"}
              </span>
            </button>
            {showSystemPrompt && (
              <div className="px-4 pb-4">
                <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {selectedProgramData.judgeAgentSystemPrompt}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Applications Table */}
      {selectedProgram && (
        <div className="mb-8">
          <ApplicationsTable
            applications={applications || []}
            isLoading={isLoadingApplications}
            selectedApplicationId={selectedApplicationId}
            onSelectApplication={handleSelectApplication}
          />
        </div>
      )}

      {/* Submission Details + Results */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Configuration */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="text-base font-semibold text-foreground">Submission Details</h2>

            {/* Project Name */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Project Name</span>
              <Input
                placeholder="e.g., ShadowSwap"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Demo Video URL</span>
              <Input
                placeholder="YouTube URL or direct video link"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>

            {/* GitHub Repo URL */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                GitHub Repository
                <span className="text-xs text-muted-foreground ml-1">(optional)</span>
              </span>
              <Input
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
            </div>

            {/* Judging Criteria */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Judging Criteria</span>
              {programCriteria && programCriteria.length > 0 ? (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Using criteria from program settings ({programCriteria.length} criteria).
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    One criterion per line. Format: &quot;Name - Description&quot;. Leave empty to
                    use default criteria.
                  </p>
                  <Textarea
                    placeholder={
                      "Innovation - How novel is the idea?\nTechnical Complexity - How impressive is the implementation?\nExecution - How complete is the product?"
                    }
                    value={criteriaText}
                    onChange={(e) => setCriteriaText(e.target.value)}
                    className="min-h-[120px]"
                  />
                </>
              )}
            </div>

            {/* Active Criteria Table */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Active criteria ({criteria.length}):
              </p>
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                        Weight
                      </th>
                      <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                        Max
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-1.5 font-medium text-foreground">{c.name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {c.description || "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">
                          {c.weight}%
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">
                          {c.maxScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || judgeMutation.isPending}
              isLoading={judgeMutation.isPending}
              className="w-full"
              size="lg"
            >
              {judgeMutation.isPending ? "Analyzing submission..." : "Evaluate Submission"}
            </Button>

            {judgeMutation.isPending && (
              <p className="text-xs text-center text-muted-foreground">
                The agent is watching the video and scoring each criterion. This may take 1-3
                minutes.
              </p>
            )}
          </div>
        </div>

        {/* Right: Preview + Results */}
        <div className="space-y-6">
          {/* Video Preview */}
          {videoUrl.trim() ? (
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Video Preview</h2>
              <VideoPreview url={videoUrl.trim()} />
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center justify-center rounded-lg border border-dashed border-border",
                "bg-muted/30 aspect-video"
              )}
            >
              <p className="text-sm text-muted-foreground">
                {selectedProgram
                  ? "Select an application or paste a video URL"
                  : "Paste a video URL to preview"}
              </p>
            </div>
          )}

          {/* Results */}
          {judgeMutation.isError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Evaluation failed
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {judgeMutation.error.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => judgeMutation.reset()}
              >
                Try again
              </Button>
            </div>
          )}

          {judgeMutation.data && <JudgeResults result={judgeMutation.data} />}
        </div>
      </div>
    </div>
  );
}
