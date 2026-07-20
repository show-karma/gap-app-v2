import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiligenceTemplate } from "@/types/diligence";

// -- Hook + toast mocks ------------------------------------------------------

const mockRefetch = vi.fn();
const mockSaveMutate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

let templateState: {
  data: DiligenceTemplate | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: typeof mockRefetch;
};
let saveState: { mutate: typeof mockSaveMutate; isPending: boolean };

vi.mock("@/hooks/useDiligence", () => ({
  useDiligenceTemplate: () => templateState,
  useSaveDiligenceTemplate: () => saveState,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { DiligenceTemplateEditor } from "../DiligenceTemplateEditor";

function makeTemplate(overrides: Partial<DiligenceTemplate> = {}): DiligenceTemplate {
  return {
    questions: [],
    updatedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  templateState = {
    data: makeTemplate(),
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  };
  // Default: a successful save invokes the onSuccess callback.
  saveState = {
    mutate: mockSaveMutate.mockImplementation(
      (_body, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
        opts?.onSuccess?.();
      }
    ),
    isPending: false,
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("DiligenceTemplateEditor", () => {
  it("uses the advisor workspace header without redundant page chrome", () => {
    render(<DiligenceTemplateEditor />);

    expect(screen.getByRole("heading", { level: 1, name: "Diligence questions" })).toBeVisible();
    expect(screen.queryByText("Back to research dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Karma · Nonprofit Research")).not.toBeInTheDocument();
  });

  it("renders the loading skeleton while the template loads", () => {
    templateState = { data: undefined, isLoading: true, isError: false, refetch: mockRefetch };
    render(<DiligenceTemplateEditor />);
    expect(screen.getByText("Loading your diligence questions…")).toBeInTheDocument();
  });

  it("renders an error state with a retry that refetches", () => {
    templateState = { data: undefined, isLoading: false, isError: true, refetch: mockRefetch };
    render(<DiligenceTemplateEditor />);

    const retry = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(retry);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state and lets the advisor add a first question", () => {
    render(<DiligenceTemplateEditor />);

    expect(screen.getByText("No questions yet")).toBeInTheDocument();

    const addFirstQuestion = screen.getByRole("button", { name: /Add your first question/i });
    expect(addFirstQuestion).not.toHaveClass("shadow-primary-button", "shadow-outline-button");
    expect(addFirstQuestion).toHaveClass("rounded-full", "bg-brand-500");
    fireEvent.click(addFirstQuestion);

    expect(screen.getByRole("textbox", { name: "Question 1" })).toBeInTheDocument();
  });

  it("edits a question and saves, showing a success toast", () => {
    templateState.data = makeTemplate({
      questions: [
        { id: "q-1", text: "First question" },
        { id: "q-2", text: "Second question" },
      ],
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    render(<DiligenceTemplateEditor />);

    const saveQuestions = screen.getByRole("button", { name: "Save questions" });
    const addQuestion = screen.getByRole("button", { name: "Add question" });
    expect(saveQuestions).not.toHaveClass("shadow-primary-button", "shadow-outline-button");
    expect(addQuestion).not.toHaveClass("shadow-primary-button", "shadow-outline-button");

    fireEvent.change(screen.getByRole("textbox", { name: "Question 1" }), {
      target: { value: "Updated first question" },
    });
    fireEvent.click(saveQuestions);

    expect(mockSaveMutate).toHaveBeenCalledTimes(1);
    expect(mockSaveMutate.mock.calls[0][0]).toEqual({
      questions: [
        { id: "q-1", text: "Updated first question" },
        { id: "q-2", text: "Second question" },
      ],
    });
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows an error toast when the save mutation fails", () => {
    saveState.mutate = mockSaveMutate.mockImplementation(
      (_body, opts?: { onError?: (e: Error) => void }) => {
        opts?.onError?.(new Error("boom"));
      }
    );
    templateState.data = makeTemplate({
      questions: [{ id: "q-1", text: "First question" }],
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    render(<DiligenceTemplateEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Save questions" }));

    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("requires confirmation before clearing all questions", () => {
    templateState.data = makeTemplate({
      questions: [{ id: "q-1", text: "First question" }],
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    render(<DiligenceTemplateEditor />);

    // Remove the only question, then attempt to save (which now clears).
    fireEvent.click(screen.getByRole("button", { name: /Remove question 1/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save questions" }));

    // The clear is gated — nothing saved yet, confirmation surfaced.
    expect(mockSaveMutate).not.toHaveBeenCalled();
    expect(screen.getByText("Clear your diligence questions?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear questions" }));
    expect(mockSaveMutate).toHaveBeenCalledTimes(1);
    expect(mockSaveMutate.mock.calls[0][0]).toEqual({ questions: [] });
  });

  it("disables Add question at the 50-question cap", () => {
    templateState.data = makeTemplate({
      questions: Array.from({ length: 50 }, (_, i) => ({
        id: `q-${i}`,
        text: `Question ${i + 1}`,
      })),
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    render(<DiligenceTemplateEditor />);

    expect(screen.getByRole("button", { name: "Add question" })).toBeDisabled();
    expect(screen.getByText(/reached the 50-question limit/i)).toBeInTheDocument();
  });

  it("keeps existing question ids stable when adding a new row", () => {
    templateState.data = makeTemplate({
      questions: [{ id: "stable-id-1", text: "First question" }],
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    render(<DiligenceTemplateEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Question 2" }), {
      target: { value: "Second question" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save questions" }));

    expect(mockSaveMutate).toHaveBeenCalledTimes(1);
    const savedQuestions = mockSaveMutate.mock.calls[0][0].questions as Array<{
      id: string;
      text: string;
    }>;
    expect(savedQuestions).toHaveLength(2);
    expect(savedQuestions[0].id).toBe("stable-id-1");
    expect(savedQuestions[1].id).not.toBe("stable-id-1");
    expect(savedQuestions[1].id.length).toBeGreaterThan(0);
  });
});
