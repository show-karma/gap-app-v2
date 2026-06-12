import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { ActivityStatusHeader } from "./ActivityStatusHeader";

/**
 * Browser-level regression coverage for the milestone due-date / status
 * presentation collapse (PR #1616, issues #1328 / #1417 / #1198 / #1298).
 *
 * `ActivityStatusHeader` derives a single normalized `dueMs` that drives BOTH
 * the rendered "Due by …" date and the status pill, so the two can never
 * disagree. These stories render the real component in a real browser and
 * assert the user-visible outcome across the non-happy-path inputs that used
 * to misbehave (raw seconds read as 1970, corrupted/zero values, etc.).
 */
const meta: Meta<typeof ActivityStatusHeader> = {
  title: "Shared/ActivityCard/ActivityStatusHeader",
  component: ActivityStatusHeader,
  parameters: { layout: "padded" },
  args: {
    activityType: "Milestone",
    showCompletionStatus: true,
    completed: false,
  },
};

export default meta;
type Story = StoryObj<typeof ActivityStatusHeader>;

const DAY_SECONDS = 86_400;
const nowSeconds = Math.floor(Date.now() / 1000);
const FUTURE_SECONDS = nowSeconds + 30 * DAY_SECONDS; // 10-digit Unix seconds, ~1 month out
const PAST_SECONDS = nowSeconds - 30 * DAY_SECONDS; // 10-digit Unix seconds, ~1 month ago
const FUTURE_MS = (nowSeconds + 30 * DAY_SECONDS) * 1000; // 13-digit milliseconds

/**
 * #1328 core regression: a milestone whose due date is in the FUTURE, with the
 * raw on-chain `endsAt` expressed in Unix *seconds*. Previously this seconds
 * value was read as milliseconds, resolving to ~1970 and rendering a red
 * "Past Due" pill on a milestone that is not actually due yet.
 */
export const FutureDueInSeconds: Story = {
  args: { dueDate: FUTURE_SECONDS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Status must read Pending (not Past Due) for a future due date.
    await expect(canvas.getByText("Pending")).toBeInTheDocument();
    await expect(canvas.queryByText("Past Due")).not.toBeInTheDocument();
    // A "Due by" date is shown and is NOT a 1970 date.
    const dueBy = canvas.getByText(/Due by/i);
    await expect(dueBy).toBeInTheDocument();
    await expect(dueBy).not.toHaveTextContent(/1970/);
  },
};

/** Milliseconds back-compat: a 13-digit future value resolves identically. */
export const FutureDueInMilliseconds: Story = {
  args: { dueDate: FUTURE_MS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Pending")).toBeInTheDocument();
    await expect(canvas.queryByText("Past Due")).not.toBeInTheDocument();
    await expect(canvas.getByText(/Due by/i)).not.toHaveTextContent(/1970/);
  },
};

/** Numeric-string seconds (serialized on-chain uint) must behave like a number. */
export const FutureDueAsNumericString: Story = {
  args: { dueDate: String(FUTURE_SECONDS) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Pending")).toBeInTheDocument();
    await expect(canvas.getByText(/Due by/i)).toBeInTheDocument();
  },
};

/** Genuinely past-due milestone still shows the red "Past Due" pill. */
export const PastDue: Story = {
  args: { dueDate: PAST_SECONDS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pill = canvas.getByText("Past Due");
    await expect(pill).toBeInTheDocument();
    // Capitalization guardrail — never "Past due".
    await expect(canvas.queryByText("Past due")).not.toBeInTheDocument();
    // The past-due pill is styled red.
    await expect(pill).toHaveClass("text-red-700");
    await expect(canvas.getByText(/Due by/i)).toBeInTheDocument();
  },
};

/**
 * Corrupted attestation value of 0 degrades to "no due date": Pending status,
 * and crucially NO "Due by" pill (instead of a 1970 date) and no red badge.
 */
export const CorruptedZero: Story = {
  args: { dueDate: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Pending")).toBeInTheDocument();
    await expect(canvas.queryByText("Past Due")).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Due by/i)).not.toBeInTheDocument();
  },
};

/**
 * A timestamp that resolves before the year-2000 floor (1999 in seconds) is
 * treated as corrupted and degraded to "no due date" rather than rendered as a
 * real past-due date.
 */
export const CorruptedPre2000: Story = {
  args: { dueDate: 915_148_800 }, // 1999-01-01 in Unix seconds
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Pending")).toBeInTheDocument();
    await expect(canvas.queryByText("Past Due")).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Due by/i)).not.toBeInTheDocument();
  },
};

/** Missing due date: Pending, no "Due by" pill. */
export const NoDueDate: Story = {
  args: { dueDate: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Pending")).toBeInTheDocument();
    await expect(canvas.queryByText(/Due by/i)).not.toBeInTheDocument();
  },
};

/** Completed milestone reports Completed regardless of due date. */
export const Completed: Story = {
  args: { completed: true, dueDate: PAST_SECONDS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Completed")).toBeInTheDocument();
    await expect(canvas.queryByText("Past Due")).not.toBeInTheDocument();
  },
};
