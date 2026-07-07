import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import type { CandidateDiligenceView, DiligenceTemplate, OutreachPreview } from "@/types/diligence";
import { OUTREACH_BODY_LIMITS } from "@/types/diligence";

const mockAskMutate = vi.fn();
const mockUseDiligenceTemplate = vi.fn();
const mockUseOutreachPreview = vi.fn();
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
  useOutreachPreview: (...args: unknown[]) => mockUseOutreachPreview(...args),
  useAskQuestions: () => ({ mutate: mockAskMutate, isPending: false }),
}));

import { AskQuestionsDialog } from "../AskQuestionsDialog";

const DEFAULT_BODY =
  "Hello,\n\nA philanthropic funder researching organizations like Hope Shelter would like to learn more about your work.\n\n1. What is your budget?";

function buildPreview(overrides: Partial<OutreachPreview> = {}): OutreachPreview {
  return {
    action: "diligence",
    subject: "A funder is interested in learning more about Hope Shelter",
    bodyText: DEFAULT_BODY,
    fixedFooter:
      'A secure "Answer securely" link is added to the end of this email automatically when it is sent.',
    editable: { subject: false, body: true },
    ...overrides,
  };
}

function mockPreviewLoaded(preview = buildPreview()) {
  mockUseOutreachPreview.mockReturnValue({
    data: preview,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
}

function mockTemplateWithQuestions() {
  const template: DiligenceTemplate = {
    questions: [{ id: "q1", text: "What is your budget?" }],
    updatedAt: "2026-06-01T00:00:00Z",
  };
  mockUseDiligenceTemplate.mockReturnValue({ data: template, isLoading: false, isError: false });
}

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

function renderDialog(view = buildView()) {
  return render(
    <AskQuestionsDialog
      reportId="report-1"
      candidateId="candidate-1"
      open
      onOpenChange={vi.fn()}
      view={view}
      candidateName="Hope Shelter"
    />
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("AskQuestionsDialog", () => {
  it("guards on an empty template, links to the editor, and disables send", () => {
    const template: DiligenceTemplate = { questions: [], updatedAt: null };
    mockUseDiligenceTemplate.mockReturnValue({ data: template, isLoading: false, isError: false });
    mockPreviewLoaded();

    renderDialog();

    expect(screen.getByRole("link", { name: "Edit your question template" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send questions" })).toBeDisabled();
    // The preview fetch is disabled while the template is empty.
    expect(mockUseOutreachPreview).toHaveBeenCalledWith(
      "report-1",
      "candidate-1",
      "diligence",
      false
    );
  });

  it("shows the full email (To, locked subject, editable body, fixed footer)", () => {
    mockTemplateWithQuestions();
    mockPreviewLoaded();

    renderDialog();

    expect(screen.getByText("Hope Shelter")).toBeInTheDocument();
    expect(
      screen.getByText("A funder is interested in learning more about Hope Shelter")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email body")).toHaveValue(DEFAULT_BODY);
    expect(screen.getByText(/Answer securely.*link is added/)).toBeInTheDocument();
  });

  it("POSTs WITHOUT a body when the advisor didn't edit", () => {
    mockTemplateWithQuestions();
    mockPreviewLoaded();
    mockAskMutate.mockImplementation((_vars, opts) => opts.onSuccess?.());
    const onOpenChange = vi.fn();

    render(
      <AskQuestionsDialog
        reportId="report-1"
        candidateId="candidate-1"
        open
        onOpenChange={onOpenChange}
        view={buildView()}
        candidateName="Hope Shelter"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Send questions" }));

    expect(mockAskMutate).toHaveBeenCalledWith(
      { reportId: "report-1", candidateId: "candidate-1" },
      expect.any(Object)
    );
    expect(toastSuccess).toHaveBeenCalledWith("Questions sent");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("POSTs WITH the edited body when the advisor changed the text", () => {
    mockTemplateWithQuestions();
    mockPreviewLoaded();
    mockAskMutate.mockImplementation((_vars, opts) => opts.onSuccess?.());

    renderDialog();

    fireEvent.change(screen.getByLabelText("Email body"), {
      target: { value: "Hello,\n\nMy own words.\n\n1. What is your budget?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send questions" }));

    expect(mockAskMutate).toHaveBeenCalledWith(
      {
        reportId: "report-1",
        candidateId: "candidate-1",
        body: "Hello,\n\nMy own words.\n\n1. What is your budget?",
      },
      expect.any(Object)
    );
  });

  it("treats a body edited back to the default as unedited", () => {
    mockTemplateWithQuestions();
    mockPreviewLoaded();

    renderDialog();

    const textarea = screen.getByLabelText("Email body");
    fireEvent.change(textarea, { target: { value: "changed" } });
    fireEvent.change(textarea, { target: { value: DEFAULT_BODY } });
    fireEvent.click(screen.getByRole("button", { name: "Send questions" }));

    expect(mockAskMutate).toHaveBeenCalledWith(
      { reportId: "report-1", candidateId: "candidate-1" },
      expect.any(Object)
    );
  });

  it("disables send and explains when the body is cleared", () => {
    mockTemplateWithQuestions();
    mockPreviewLoaded();

    renderDialog();

    fireEvent.change(screen.getByLabelText("Email body"), { target: { value: "   " } });

    expect(screen.getByText("The email body can't be empty.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send questions" })).toBeDisabled();
    expect(mockAskMutate).not.toHaveBeenCalled();
  });

  it("blocks send above the character limit and shows the counter", () => {
    mockTemplateWithQuestions();
    mockPreviewLoaded();

    renderDialog();

    fireEvent.change(screen.getByLabelText("Email body"), {
      target: { value: "x".repeat(OUTREACH_BODY_LIMITS.MAX_CHARS + 1) },
    });

    expect(screen.getByText(/can't exceed 10,000 characters/)).toBeInTheDocument();
    expect(screen.getByText("10,001 / 10,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send questions" })).toBeDisabled();
  });

  it("shows an in-modal error with retry and blocks sending when the preview fails", () => {
    mockTemplateWithQuestions();
    const refetch = vi.fn();
    mockUseOutreachPreview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    renderDialog();

    expect(screen.getByText("Couldn't load the email preview.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send questions" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });
});
