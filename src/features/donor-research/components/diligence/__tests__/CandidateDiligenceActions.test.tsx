import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import type {
  CandidateDiligenceView,
  DiligenceCoarseStatus,
  DiligenceTemplate,
} from "@/types/diligence";

const mockUseCandidateDiligence = vi.fn();
const mockRefetch = vi.fn();

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const emptyTemplate: DiligenceTemplate = { questions: [], updatedAt: null };

vi.mock("@/hooks/useDiligence", () => ({
  useCandidateDiligence: (...args: unknown[]) => mockUseCandidateDiligence(...args),
  useDiligenceTemplate: () => ({ data: emptyTemplate, isLoading: false, isError: false }),
  useOutreachPreview: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  }),
  useAskQuestions: () => ({ mutate: vi.fn(), isPending: false }),
  useSaveDiligenceTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  useRequestIntro: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAdvisorEmail: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { CandidateDiligenceActions } from "../CandidateDiligenceActions";

function buildView(overrides: Partial<CandidateDiligenceView> = {}): CandidateDiligenceView {
  return {
    reportId: "report-1",
    candidateId: "candidate-1",
    coarseStatus: "not_requested" as DiligenceCoarseStatus,
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

describe("CandidateDiligenceActions", () => {
  it("renders an inline loading state", () => {
    mockUseCandidateDiligence.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    render(<CandidateDiligenceActions reportId="report-1" candidateId="candidate-1" />);

    expect(screen.getByText("Loading actions…")).toBeInTheDocument();
  });

  it("renders an inline error state with retry", () => {
    mockUseCandidateDiligence.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
      refetch: mockRefetch,
    });

    render(<CandidateDiligenceActions reportId="report-1" candidateId="candidate-1" />);

    expect(screen.getByText("Couldn't load actions.")).toBeInTheDocument();
    screen.getByRole("button", { name: "Retry" }).click();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("gates the two buttons on view.actions, not coarseStatus", () => {
    mockUseCandidateDiligence.mockReturnValue({
      isLoading: false,
      isError: false,
      data: buildView({
        coarseStatus: "answered",
        actions: { canAskQuestions: false, canConnect: true },
      }),
    });

    render(<CandidateDiligenceActions reportId="report-1" candidateId="candidate-1" />);

    expect(screen.getByRole("button", { name: "Ask questions" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Connect" })).not.toBeDisabled();
  });

  it("renders the status badge from coarseStatus", () => {
    mockUseCandidateDiligence.mockReturnValue({
      isLoading: false,
      isError: false,
      data: buildView({ coarseStatus: "intro_sent" }),
    });

    render(<CandidateDiligenceActions reportId="report-1" candidateId="candidate-1" />);

    expect(screen.getByText("Intro sent")).toBeInTheDocument();
  });

  it("labels a queued intro 'Intro queued', never 'Intro sent'", () => {
    mockUseCandidateDiligence.mockReturnValue({
      isLoading: false,
      isError: false,
      data: buildView({
        coarseStatus: "intro_sent",
        intro: { introRequestId: "i1", requestedAt: "2026-07-07T00:00:00Z", sentAt: null },
      }),
    });

    render(<CandidateDiligenceActions reportId="report-1" candidateId="candidate-1" />);

    expect(screen.getByText("Intro queued")).toBeInTheDocument();
    expect(screen.queryByText(/Intro sent/)).not.toBeInTheDocument();
  });

  it("labels a delivered intro 'Intro sent' with the relative time detail", () => {
    mockUseCandidateDiligence.mockReturnValue({
      isLoading: false,
      isError: false,
      data: buildView({
        coarseStatus: "intro_sent",
        intro: {
          introRequestId: "i1",
          requestedAt: "2026-07-01T00:00:00Z",
          sentAt: "2026-07-06T00:00:00Z",
        },
      }),
    });

    render(<CandidateDiligenceActions reportId="report-1" candidateId="candidate-1" />);

    expect(screen.getAllByText(/Intro sent/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Intro queued")).not.toBeInTheDocument();
  });

  it("renders no badge for not_requested", () => {
    mockUseCandidateDiligence.mockReturnValue({
      isLoading: false,
      isError: false,
      data: buildView({ coarseStatus: "not_requested" }),
    });

    render(<CandidateDiligenceActions reportId="report-1" candidateId="candidate-1" />);

    expect(screen.queryByText("Questions sent")).not.toBeInTheDocument();
    expect(screen.queryByText("Answered")).not.toBeInTheDocument();
    expect(screen.queryByText("Intro sent")).not.toBeInTheDocument();
  });

  it("shows the collected answers when present", () => {
    mockUseCandidateDiligence.mockReturnValue({
      isLoading: false,
      isError: false,
      data: buildView({
        coarseStatus: "answered",
        request: {
          requestId: "req-1",
          requestedAt: "2026-06-01T00:00:00Z",
          answeredAt: "2026-06-10T00:00:00Z",
          questions: [{ id: "q1", text: "What is your annual budget?" }],
        },
        latestAnswers: { answers: { q1: "$1.2M" }, receivedAt: "2026-06-10T00:00:00Z" },
      }),
    });

    render(<CandidateDiligenceActions reportId="report-1" candidateId="candidate-1" />);

    expect(screen.getByText("What is your annual budget?")).toBeInTheDocument();
    expect(screen.getByText("$1.2M")).toBeInTheDocument();
  });
});
