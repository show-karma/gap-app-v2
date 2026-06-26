import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import type { CandidateDiligenceView, DiligenceTemplate } from "@/types/diligence";

const mockAskMutate = vi.fn();
const mockUseDiligenceTemplate = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/hooks/useDiligence", () => ({
  useDiligenceTemplate: () => mockUseDiligenceTemplate(),
  useAskQuestions: () => ({ mutate: mockAskMutate, isPending: false }),
}));

import { AskQuestionsDialog } from "../AskQuestionsDialog";

function buildView(overrides: Partial<CandidateDiligenceView> = {}): CandidateDiligenceView {
  return {
    reportId: "report-1",
    candidateId: "candidate-1",
    coarseStatus: "not_requested",
    request: null,
    latestAnswers: null,
    intro: null,
    actions: { canAskQuestions: true, canConnect: true },
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("AskQuestionsDialog", () => {
  it("guards on an empty template, links to the editor, and disables send", () => {
    const template: DiligenceTemplate = { questions: [], updatedAt: null };
    mockUseDiligenceTemplate.mockReturnValue({ data: template, isLoading: false, isError: false });

    render(
      <AskQuestionsDialog
        reportId="report-1"
        candidateId="candidate-1"
        open
        onOpenChange={vi.fn()}
        view={buildView()}
      />
    );

    expect(screen.getByRole("link", { name: "Edit your question template" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send questions" })).toBeDisabled();
  });

  it("sends the questions and closes on success", () => {
    const template: DiligenceTemplate = {
      questions: [{ id: "q1", text: "What is your budget?" }],
      updatedAt: "2026-06-01T00:00:00Z",
    };
    mockUseDiligenceTemplate.mockReturnValue({ data: template, isLoading: false, isError: false });
    mockAskMutate.mockImplementation((_vars, opts) => opts.onSuccess?.());
    const onOpenChange = vi.fn();

    render(
      <AskQuestionsDialog
        reportId="report-1"
        candidateId="candidate-1"
        open
        onOpenChange={onOpenChange}
        view={buildView()}
      />
    );

    expect(screen.getByText("What is your budget?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send questions" }));

    expect(mockAskMutate).toHaveBeenCalledWith(
      { reportId: "report-1", candidateId: "candidate-1" },
      expect.any(Object)
    );
    expect(toastSuccess).toHaveBeenCalledWith("Questions sent");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("previews the frozen snapshot when a request already exists", () => {
    mockUseDiligenceTemplate.mockReturnValue({
      data: { questions: [{ id: "live", text: "Live template question" }], updatedAt: null },
      isLoading: false,
      isError: false,
    });

    render(
      <AskQuestionsDialog
        reportId="report-1"
        candidateId="candidate-1"
        open
        onOpenChange={vi.fn()}
        view={buildView({
          coarseStatus: "in_progress",
          request: {
            requestId: "req-1",
            requestedAt: "2026-06-01T00:00:00Z",
            answeredAt: null,
            questions: [{ id: "frozen", text: "Frozen snapshot question" }],
          },
        })}
      />
    );

    // Renders the frozen snapshot, NOT the diverged live template.
    expect(screen.getByText("Frozen snapshot question")).toBeInTheDocument();
    expect(screen.queryByText("Live template question")).not.toBeInTheDocument();
  });
});
