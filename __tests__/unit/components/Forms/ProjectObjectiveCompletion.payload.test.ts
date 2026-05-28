/**
 * Regression tests for `buildProjectObjectiveCompletionPayload`.
 *
 * The bug this guards against: the project-milestone completion form was
 * dropping form-collected `outputs` and `deliverables` arrays on submit,
 * so the resulting on-chain attestation had only `type/proofOfWork/reason`.
 * Owners reported empty "Metrics" sections on completed milestone cards.
 */

import { describe, expect, it } from "vitest";
import {
  buildProjectObjectiveCompletionPayload,
  projectObjectiveCompletionSchema,
} from "@/components/Forms/projectObjectiveCompletionPayload";

describe("buildProjectObjectiveCompletionPayload", () => {
  it("forwards outputs and deliverables onto the attestation payload", () => {
    const payload = buildProjectObjectiveCompletionPayload({
      description: "Shipped the bridge",
      proofOfWork: "https://example.com/proof",
      outputs: [
        {
          outputId: "tps",
          value: 1500,
          proof: "https://example.com/tps",
          startDate: "",
          endDate: "",
        },
        {
          outputId: "users",
          value: "42",
          proof: "",
          startDate: "2026-01-01",
          endDate: "2026-03-01",
        },
      ],
      deliverables: [
        { name: "Contract", proof: "https://etherscan.io/0xabc", description: "Deployed contract" },
      ],
    });

    expect(payload).toEqual({
      proofOfWork: "https://example.com/proof",
      reason: "Shipped the bridge",
      type: "project-milestone-completed",
      outputs: [
        {
          outputId: "tps",
          value: 1500,
          proof: "https://example.com/tps",
          startDate: "",
          endDate: "",
        },
        {
          outputId: "users",
          value: "42",
          proof: "",
          startDate: "2026-01-01",
          endDate: "2026-03-01",
        },
      ],
      deliverables: [
        { name: "Contract", proof: "https://etherscan.io/0xabc", description: "Deployed contract" },
      ],
    });
  });

  it("preserves empty outputs and deliverables arrays without losing them", () => {
    const payload = buildProjectObjectiveCompletionPayload({
      description: "",
      proofOfWork: "",
      outputs: [],
      deliverables: [],
    });

    expect(payload.outputs).toEqual([]);
    expect(payload.deliverables).toEqual([]);
    expect(payload.type).toBe("project-milestone-completed");
  });

  it("trims whitespace on description and proofOfWork via sanitizeInput", () => {
    const payload = buildProjectObjectiveCompletionPayload({
      description: "  shipped the work  ",
      proofOfWork: "  https://example.com/proof  ",
      outputs: [],
      deliverables: [],
    });

    expect(payload.reason).toBe("shipped the work");
    expect(payload.proofOfWork).toBe("https://example.com/proof");
  });

  it("rejects whitespace-only values on required string fields", () => {
    // Without .trim() before .min(1), "   " would pass the required check
    // and a whitespace-only payload could be submitted on chain.
    const result = projectObjectiveCompletionSchema.safeParse({
      description: "",
      proofOfWork: "",
      outputs: [{ outputId: "   ", value: 1 }],
      deliverables: [{ name: "   ", proof: "   " }],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a proofOfWork URL with surrounding whitespace", () => {
    // Form-side trim() lets validators run against the normalised value, so
    // "  https://example.com  " is accepted rather than rejected as invalid URL.
    const result = projectObjectiveCompletionSchema.safeParse({
      description: "",
      proofOfWork: "  https://example.com/proof  ",
      outputs: [],
      deliverables: [],
    });

    expect(result.success).toBe(true);
  });

  it("always stamps the project-milestone-completed type", () => {
    const payload = buildProjectObjectiveCompletionPayload({
      description: "anything",
      proofOfWork: "https://example.com",
      outputs: [{ outputId: "id", value: 1 }],
      deliverables: [{ name: "n", proof: "https://example.com/p" }],
    });

    expect(payload.type).toBe("project-milestone-completed");
  });
});
