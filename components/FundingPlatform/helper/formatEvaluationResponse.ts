/**
 * Evaluation object structure
 */
interface EvaluationObject {
  evaluation_status?: string;
  disqualification_reason?: string;
  decision?: string;
  final_score?: number;
  evaluation_summary?: {
    strengths?: string[];
    concerns?: string[];
    risk_factors?: string[];
  };
  improvement_recommendations?: Array<{
    priority?: string | number;
    recommendation?: string;
    impact?: string;
  }>;
  reviewer_confidence?: string | number;
  additional_notes?: string;
  [key: string]: unknown;
}

/**
 * Formats AI evaluation response JSON into a human-readable YAML-like string
 * This format is used for CSV export and display purposes
 * @param evaluationJsonString - The evaluation JSON string from the database
 * @returns Formatted string in YAML-like format, or empty string if invalid
 */
export function formatEvaluationResponse(evaluationJsonString: string | null | undefined): string {
  if (!evaluationJsonString) {
    return "";
  }

  try {
    const evaluation = JSON.parse(evaluationJsonString) as EvaluationObject;
    return formatEvaluationObject(evaluation);
  } catch (error) {
    console.warn("Failed to parse evaluation JSON:", error);
    return "";
  }
}

/**
 * Formats an evaluation object into YAML-like string format
 * @param evaluation - The parsed evaluation object
 * @returns Formatted YAML-like string
 */
function formatEvaluationObject(evaluation: EvaluationObject): string {
  const lines: string[] = [];
  const KEY_PADDING = 30;

  const padKey = (key: string) => key.padEnd(KEY_PADDING);

  const formatSimpleField = (key: string, value: unknown): void => {
    if (value === null || value === undefined) {
      lines.push(`${padKey(key)}: null`);
      return;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const stringValue = typeof value === "string" ? value.replace(/\n/g, "\\n") : String(value);
      lines.push(`${padKey(key)}: ${stringValue}`);
    }
  };

  const formatArrayField = (fieldName: string, items: string[]): void => {
    if (Array.isArray(items) && items.length > 0) {
      lines.push(`  ${fieldName}: `);
      for (const item of items) {
        lines.push(`    - ${item}`);
      }
    }
  };

  // Format simple fields
  const simpleFields: Array<keyof EvaluationObject & string> = [
    "evaluation_status",
    "disqualification_reason",
    "decision",
    "final_score",
    "reviewer_confidence",
    "additional_notes",
  ];

  simpleFields.forEach((field) => {
    if (evaluation[field] !== undefined) {
      formatSimpleField(field, evaluation[field]);
    }
  });

  // Format evaluation_summary
  if (evaluation.evaluation_summary) {
    lines.push(`${padKey("evaluation_summary")}: `);
    const summary = evaluation.evaluation_summary;
    formatArrayField("strengths", summary.strengths || []);
    formatArrayField("concerns", summary.concerns || []);
    formatArrayField("risk_factors", summary.risk_factors || []);
  }

  // Format improvement_recommendations
  const recommendations = evaluation.improvement_recommendations;
  if (Array.isArray(recommendations) && recommendations.length > 0) {
    lines.push(`${padKey("improvement_recommendations")}: `);
    recommendations.forEach((rec) => {
      lines.push(`  - `);
      if (rec.priority !== undefined) lines.push(`    priority:       ${String(rec.priority)}`);
      if (rec.recommendation) lines.push(`    recommendation: ${rec.recommendation}`);
      if (rec.impact) lines.push(`    impact:         ${rec.impact}`);
    });
  }

  // Handle any other fields that weren't explicitly handled
  const handledKeys = new Set([
    ...simpleFields,
    "evaluation_summary",
    "improvement_recommendations",
  ]);

  Object.entries(evaluation).forEach(([key, value]) => {
    if (!handledKeys.has(key) && value !== null && value !== undefined) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        formatSimpleField(key, value);
      }
    }
  });

  return lines.join("\n");
}
