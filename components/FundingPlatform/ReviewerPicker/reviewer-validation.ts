import { validateEmail, validateSlack, validateTelegram } from "@/utilities/validators";

// Mirrors gap-indexer ReviewerDataSchema
// (app/modules/v2/api/controllers/shared/dto/reviewer-data.dto.ts).
// Rules come from utilities/validators.ts (same regex/length bounds as BE).

const TELEGRAM_ERROR =
  "Invalid Telegram handle (5-32 letters, digits or underscores, optional @ prefix)";
const SLACK_ERROR = "Slack value must be between 2 and 254 characters";

const NAME_MAX = 200;

interface ReviewerRowInput {
  name: string;
  email: string;
  telegram: string;
  slack: string;
}

interface ReviewerRowValidationResult {
  ok: boolean;
  error?: string;
}

export function validateReviewerRow(row: ReviewerRowInput): ReviewerRowValidationResult {
  const name = row.name.replace(/<[^>]*>/g, "").trim();
  if (!name) return { ok: false, error: "Name is required" };
  if (name.length > NAME_MAX) {
    return { ok: false, error: `Name must be at most ${NAME_MAX} characters` };
  }
  if (!validateEmail(row.email)) {
    return { ok: false, error: "Valid email is required" };
  }
  if (row.telegram && !validateTelegram(row.telegram)) {
    return { ok: false, error: TELEGRAM_ERROR };
  }
  if (row.slack && !validateSlack(row.slack)) {
    return { ok: false, error: SLACK_ERROR };
  }
  return { ok: true };
}
