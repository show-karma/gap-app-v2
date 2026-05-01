import { z } from "zod";

export const EVALUATION_STYLES = ["RUBRIC", "NARRATIVE", "QUICK_SCORE"] as const;
export const evaluationStyleSchema = z.enum(EVALUATION_STYLES);
export type EvaluationStyle = z.infer<typeof evaluationStyleSchema>;

export const SESSION_STATUSES = ["DRAFT", "ITERATING", "READY_FOR_BULK", "COMPLETED"] as const;
export const sessionStatusSchema = z.enum(SESSION_STATUSES);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

// Field caps mirror BE schema (kept conservative).
export const PROGRAM_DESCRIPTION_MAX = 10_000;
export const EVALUATION_CRITERIA_MAX = 10_000;
export const APPLICATION_TEXT_MAX = 50_000;
export const FEEDBACK_MAX = 2_000;
export const SAMPLE_APPLICATION_MAX = 50_000;

export const sessionCreateSchema = z.object({
  programDescription: z
    .string()
    .trim()
    .min(20, "Describe your program in at least 20 characters")
    .max(
      PROGRAM_DESCRIPTION_MAX,
      `Program description must be at most ${PROGRAM_DESCRIPTION_MAX} characters`
    ),
  evaluationCriteria: z
    .string()
    .trim()
    .min(20, "Describe your evaluation criteria in at least 20 characters")
    .max(
      EVALUATION_CRITERIA_MAX,
      `Evaluation criteria must be at most ${EVALUATION_CRITERIA_MAX} characters`
    ),
  evaluationStyle: evaluationStyleSchema,
});
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;

export const sessionEvaluateSchema = z.object({
  applicationText: z
    .string()
    .trim()
    .min(20, "Provide a sample application of at least 20 characters")
    .max(
      APPLICATION_TEXT_MAX,
      `Application text must be at most ${APPLICATION_TEXT_MAX} characters`
    ),
});
export type SessionEvaluateInput = z.infer<typeof sessionEvaluateSchema>;

export const sessionFeedbackSchema = z.object({
  feedback: z
    .string()
    .trim()
    .min(5, "Feedback must be at least 5 characters")
    .max(FEEDBACK_MAX, `Feedback must be at most ${FEEDBACK_MAX} characters`),
});
export type SessionFeedbackInput = z.infer<typeof sessionFeedbackSchema>;

export const sessionSampleSchema = z.object({
  sampleApplication: z
    .string()
    .trim()
    .min(20, "Sample application must be at least 20 characters")
    .max(
      SAMPLE_APPLICATION_MAX,
      `Sample application must be at most ${SAMPLE_APPLICATION_MAX} characters`
    ),
});
export type SessionSampleInput = z.infer<typeof sessionSampleSchema>;

export interface SessionResponse {
  id: string;
  userId: string;
  programDescription: string;
  evaluationCriteria: string;
  evaluationStyle: EvaluationStyle;
  status: SessionStatus;
  feedbackHistory: string[];
  sampleApplication: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationResultResponse {
  id: string;
  sessionId: string;
  score: number | null;
  summary: string | null;
  fullEvaluation: Record<string, unknown>;
  iterationNumber: number;
  model: string;
  createdAt: string;
}

export const BULK_JOB_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;
export type BulkJobStatus = (typeof BULK_JOB_STATUSES)[number];

export interface BulkJobResponse {
  id: string;
  sessionId: string;
  userId: string;
  status: BulkJobStatus;
  totalApplications: number;
  completedApplications: number;
  failedApplications: number;
  hasResult: boolean;
  startedAt: string;
  completedAt: string | null;
}
