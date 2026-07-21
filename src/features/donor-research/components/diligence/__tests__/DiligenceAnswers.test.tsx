import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CandidateDiligenceAnswers, CandidateDiligenceRequest } from "@/types/diligence";
import { DiligenceAnswers } from "../DiligenceAnswers";

const request: CandidateDiligenceRequest = {
  requestId: "req-1",
  requestedAt: "2026-06-01T00:00:00Z",
  answeredAt: "2026-06-10T00:00:00Z",
  questions: [
    { id: "q1", text: "What is your annual budget?" },
    { id: "q2", text: "How many staff do you employ?" },
  ],
};

describe("DiligenceAnswers", () => {
  it("renders each frozen-snapshot question against its answer", () => {
    const answers: CandidateDiligenceAnswers = {
      answers: { q1: "$1.2M", q2: "12 full-time staff" },
      receivedAt: "2026-06-10T00:00:00Z",
    };

    render(<DiligenceAnswers request={request} answers={answers} />);

    expect(screen.getByText("What is your annual budget?")).toBeInTheDocument();
    expect(screen.getByText("$1.2M")).toBeInTheDocument();
    expect(screen.getByText("How many staff do you employ?")).toBeInTheDocument();
    expect(screen.getByText("12 full-time staff")).toBeInTheDocument();
  });

  it("shows 'No answer provided' for snapshot questions missing an answer", () => {
    const answers: CandidateDiligenceAnswers = {
      answers: { q1: "$1.2M" },
      receivedAt: "2026-06-10T00:00:00Z",
    };

    render(<DiligenceAnswers request={request} answers={answers} />);

    // q2 has no key in answers — render the explicit fallback, not a blank.
    expect(screen.getByText("No answer provided")).toBeInTheDocument();
  });

  it("pluralizes the answered count", () => {
    const answers: CandidateDiligenceAnswers = {
      answers: { q1: "$1.2M" },
      receivedAt: "2026-06-10T00:00:00Z",
    };

    render(<DiligenceAnswers request={request} answers={answers} />);

    // One answer present → singular.
    expect(screen.getByText(/1 answer/)).toBeInTheDocument();
    expect(screen.queryByText(/1 answers/)).not.toBeInTheDocument();
  });
});
