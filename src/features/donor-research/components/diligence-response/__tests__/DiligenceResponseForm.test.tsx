import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiligenceSubmitError } from "@/services/diligence.service";
import type { DiligenceQuestion } from "@/types/diligence";

const mockMutate = vi.fn();
let mockIsPending = false;

vi.mock("@/hooks/useDiligence", () => ({
  useSubmitDiligenceResponse: () => ({ mutate: mockMutate, isPending: mockIsPending }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { DiligenceResponseForm } from "../DiligenceResponseForm";

const questions: DiligenceQuestion[] = [
  { id: "q1", text: "What is your mission?" },
  { id: "q2", text: "How do you measure impact?" },
];

describe("DiligenceResponseForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("renders one textarea per question", () => {
    render(<DiligenceResponseForm token="tok" questions={questions} />);
    expect(screen.getByText("What is your mission?")).toBeInTheDocument();
    expect(screen.getByText("How do you measure impact?")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("blocks submission and warns when no answer is provided", async () => {
    render(<DiligenceResponseForm token="tok" questions={questions} />);
    fireEvent.submit(screen.getByRole("button", { name: /Submit/ }).closest("form")!);
    await waitFor(() => {
      expect(
        screen.getByText("Please answer at least one question before submitting.")
      ).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits only non-empty answers and shows a success toast", async () => {
    mockMutate.mockImplementation((_body, opts) =>
      opts?.onSuccess?.({ accepted: true, submitted: true })
    );
    render(<DiligenceResponseForm token="tok" questions={questions} />);

    const textareas = screen.getAllByRole("textbox");
    fireEvent.change(textareas[0], { target: { value: "We help people." } });
    fireEvent.submit(textareas[0].closest("form")!);

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate).toHaveBeenCalledWith(
      { answers: [{ questionId: "q1", text: "We help people." }] },
      expect.any(Object)
    );
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it("still shows success when accepted is false", async () => {
    mockMutate.mockImplementation((_body, opts) =>
      opts?.onSuccess?.({ accepted: false, submitted: true })
    );
    render(<DiligenceResponseForm token="tok" questions={questions} />);
    const textareas = screen.getAllByRole("textbox");
    fireEvent.change(textareas[0], { target: { value: "Answer" } });
    fireEvent.submit(textareas[0].closest("form")!);
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
  });

  it("shows the wait-and-retry message on a 429 and keeps the form", async () => {
    mockMutate.mockImplementation((_body, opts) =>
      opts?.onError?.(new DiligenceSubmitError("rate limited", 429))
    );
    render(<DiligenceResponseForm token="tok" questions={questions} />);
    const textareas = screen.getAllByRole("textbox");
    fireEvent.change(textareas[0], { target: { value: "Answer" } });
    fireEvent.submit(textareas[0].closest("form")!);

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Please wait a moment and try again.")
    );
    // Form is still present for a retry.
    expect(screen.getByRole("button", { name: /Submit/ })).toBeInTheDocument();
  });

  it("shows an invalid-link message on a 404", async () => {
    mockMutate.mockImplementation((_body, opts) =>
      opts?.onError?.(new DiligenceSubmitError("gone", 404))
    );
    render(<DiligenceResponseForm token="tok" questions={questions} />);
    const textareas = screen.getAllByRole("textbox");
    fireEvent.change(textareas[0], { target: { value: "Answer" } });
    fireEvent.submit(textareas[0].closest("form")!);
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("This link is no longer valid.")
    );
  });

  it("disables the submit button while pending", () => {
    mockIsPending = true;
    render(<DiligenceResponseForm token="tok" questions={questions} />);
    expect(screen.getByRole("button", { name: /Submitting/ })).toBeDisabled();
  });
});
