/**
 * @file Tests for program-prompt.service.ts
 * @description Tests all program prompt service operations: get, save, test, bulk evaluate, job status.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      FUNDING_PROGRAMS: {
        PROMPTS: {
          GET: (id: string) => `/v2/programs/${id}/prompts`,
          SAVE: (id: string, type: string) => `/v2/programs/${id}/prompts/${type}`,
          TEST: (id: string, type: string) => `/v2/programs/${id}/prompts/${type}/test`,
          BULK_EVALUATE: (id: string) => `/v2/programs/${id}/prompts/bulk-evaluate`,
          JOB_STATUS: (id: string, jobId: string) => `/v2/programs/${id}/prompts/jobs/${jobId}`,
        },
      },
    },
  },
}));

import { programPromptService } from "@/features/prompt-management/services/program-prompt.service";
import type {
  SaveProgramPromptRequest,
  TestProgramPromptRequest,
} from "@/features/prompt-management/types/program-prompt";

describe("programPromptService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // getPrompts
  // =========================================================================

  describe("getPrompts", () => {
    it("returns prompts response", async () => {
      const response = { external: { id: "p1" }, internal: null };
      mockGet.mockResolvedValue(response);

      const result = await programPromptService.getPrompts("prog-1");
      expect(result).toEqual(response);
      expect(mockGet).toHaveBeenCalledWith("/v2/programs/prog-1/prompts");
    });

    it("throws on error", async () => {
      mockGet.mockRejectedValue(new Error("Not found"));
      await expect(programPromptService.getPrompts("prog-1")).rejects.toThrow("Not found");
    });

    it("throws when response is null", async () => {
      mockGet.mockResolvedValue(null);
      await expect(programPromptService.getPrompts("prog-1")).rejects.toThrow(
        "No response from server"
      );
    });
  });

  // =========================================================================
  // savePrompt
  // =========================================================================

  describe("savePrompt", () => {
    it("saves and returns prompt", async () => {
      const prompt = { id: "p1", name: "My Prompt" };
      mockPut.mockResolvedValue(prompt);

      const data = { name: "My Prompt", template: "Hello {name}" };
      const result = await programPromptService.savePrompt(
        "prog-1",
        "external",
        data as unknown as SaveProgramPromptRequest
      );
      expect(result).toEqual(prompt);
      expect(mockPut).toHaveBeenCalledWith("/v2/programs/prog-1/prompts/external", data);
    });

    it("throws on error", async () => {
      mockPut.mockRejectedValue(new Error("Validation error"));
      await expect(
        programPromptService.savePrompt(
          "prog-1",
          "external",
          {} as unknown as SaveProgramPromptRequest
        )
      ).rejects.toThrow("Validation error");
    });
  });

  // =========================================================================
  // testPrompt
  // =========================================================================

  describe("testPrompt", () => {
    it("tests prompt and returns result", async () => {
      const testResult = { compiledPrompt: "Hello World", response: "OK" };
      mockPost.mockResolvedValue(testResult);

      const result = await programPromptService.testPrompt("prog-1", "internal", {
        applicationId: "app-1",
      } as TestProgramPromptRequest);
      expect(result).toEqual(testResult);
      expect(mockPost).toHaveBeenCalledWith("/v2/programs/prog-1/prompts/internal/test", {
        applicationId: "app-1",
      });
    });

    it("throws on error", async () => {
      mockPost.mockRejectedValue(new Error("Application not found"));
      await expect(
        programPromptService.testPrompt(
          "prog-1",
          "external",
          {} as unknown as TestProgramPromptRequest
        )
      ).rejects.toThrow("Application not found");
    });
  });

  // =========================================================================
  // triggerBulkEvaluation
  // =========================================================================

  describe("triggerBulkEvaluation", () => {
    it("triggers bulk evaluation and returns job info", async () => {
      const jobInfo = { jobId: "job-1", totalApplications: 50 };
      mockPost.mockResolvedValue(jobInfo);

      const result = await programPromptService.triggerBulkEvaluation("prog-1", "external");
      expect(result).toEqual(jobInfo);
      expect(mockPost).toHaveBeenCalledWith("/v2/programs/prog-1/prompts/bulk-evaluate", {
        promptType: "external",
      });
    });

    it("throws on error", async () => {
      mockPost.mockRejectedValue(new Error("Rate limited"));
      await expect(
        programPromptService.triggerBulkEvaluation("prog-1", "internal")
      ).rejects.toThrow("Rate limited");
    });
  });

  // =========================================================================
  // getJobStatus
  // =========================================================================

  describe("getJobStatus", () => {
    it("returns job status", async () => {
      const job = { jobId: "job-1", status: "completed", progress: 100 };
      mockGet.mockResolvedValue(job);

      const result = await programPromptService.getJobStatus("prog-1", "job-1");
      expect(result).toEqual(job);
      expect(mockGet).toHaveBeenCalledWith("/v2/programs/prog-1/prompts/jobs/job-1");
    });

    it("throws on error", async () => {
      mockGet.mockRejectedValue(new Error("Job not found"));
      await expect(programPromptService.getJobStatus("prog-1", "bad-job")).rejects.toThrow(
        "Job not found"
      );
    });
  });
});
