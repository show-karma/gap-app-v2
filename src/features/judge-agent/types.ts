export interface JudgeCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  reasoning: string;
  evidence: string[];
}

export interface GitHubInsights {
  repoUrl: string;
  totalCommits: number;
  contributors: number;
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  languages: Record<string, number>;
  isFork: boolean;
  aiToolUsage: {
    totalAiCommits: number;
    totalCommitsAnalyzed: number;
    aiToolMentions: string[];
    percentage: number;
  };
}

export interface JudgeResult {
  projectName: string;
  tldr: string;
  scores: CriterionScore[];
  totalScore: number;
  maxPossibleScore: number;
  weightedScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  completenessFlag: "complete" | "partial" | "incomplete" | "abandoned";
  githubInsights?: GitHubInsights;
  videoAnalysis?: string;
}

export interface EvaluateRequest {
  videoUrl: string;
  projectName: string;
  projectDescription?: string;
  hackathonName?: string;
  hackathonDescription?: string;
  repoUrl?: string;
  criteria: JudgeCriterion[];
  systemPrompt?: string;
  referenceNumber?: string;
  applicationData?: Record<string, unknown>;
}

export const DEFAULT_CRITERIA: JudgeCriterion[] = [
  {
    id: "innovation",
    name: "Innovation & Creativity",
    description:
      "How novel is the idea? Does it introduce a new approach or solve a problem in a unique way?",
    weight: 20,
    maxScore: 10,
  },
  {
    id: "technical",
    name: "Technical Complexity",
    description:
      "How technically impressive is the implementation? Consider difficulty, sophistication, and engineering quality.",
    weight: 20,
    maxScore: 10,
  },
  {
    id: "execution",
    name: "Execution & Completeness",
    description:
      "How complete and polished is the product? Is it a working prototype or just a concept?",
    weight: 20,
    maxScore: 10,
  },
  {
    id: "impact",
    name: "Potential Impact",
    description:
      "How large is the potential impact? Consider market size, users affected, or social benefit.",
    weight: 15,
    maxScore: 10,
  },
  {
    id: "design",
    name: "Design & User Experience",
    description:
      "How well-designed is the product? Is it intuitive, accessible, and visually appealing?",
    weight: 15,
    maxScore: 10,
  },
  {
    id: "presentation",
    name: "Presentation & Communication",
    description: "How well did the team communicate their idea? Was the demo clear and compelling?",
    weight: 10,
    maxScore: 10,
  },
];
