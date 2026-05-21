import { describe, expect, it } from "vitest";
import { validateReviewerRow } from "../reviewer-validation";

const valid = {
  name: "Alice",
  email: "alice@example.com",
  telegram: "alice_tg",
  slack: "alice",
};

describe("validateReviewerRow", () => {
  it("should_pass_for_valid_row", () => {
    expect(validateReviewerRow(valid)).toEqual({ ok: true });
  });

  it("should_pass_when_telegram_and_slack_are_empty", () => {
    expect(validateReviewerRow({ ...valid, telegram: "", slack: "" })).toEqual({ ok: true });
  });

  it("should_fail_when_telegram_too_short", () => {
    const result = validateReviewerRow({ ...valid, telegram: "bru1" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Telegram/);
  });

  it("should_fail_when_telegram_has_invalid_chars", () => {
    const result = validateReviewerRow({ ...valid, telegram: "alice-tg" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Telegram/);
  });

  it("should_fail_when_email_invalid", () => {
    const result = validateReviewerRow({ ...valid, email: "not-an-email" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/email/i);
  });

  it("should_fail_when_name_empty", () => {
    const result = validateReviewerRow({ ...valid, name: "   " });
    expect(result.ok).toBe(false);
  });

  it("should_fail_when_slack_too_short", () => {
    const result = validateReviewerRow({ ...valid, slack: "a" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Slack/);
  });

  it("should_accept_telegram_with_at_prefix", () => {
    expect(validateReviewerRow({ ...valid, telegram: "@alice_tg" })).toEqual({ ok: true });
  });
});
