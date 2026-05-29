import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ApplicationQuestion, IFormSchema } from "@/types/whitelabel-entities";
import { ApplicationForm } from "../ApplicationForm";

const mockAuthState = vi.hoisted(() => ({
  authenticated: true,
  login: vi.fn(),
}));

const mockAIEvaluation = vi.hoisted(() => ({
  triggerEvaluation: vi.fn(),
  clearEvaluation: vi.fn(),
  error: null as string | null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/hooks/useRealTimeAIEvaluation", () => ({
  useRealTimeAIEvaluation: () => ({
    evaluation: null,
    evaluationResponse: null,
    isLoading: false,
    error: mockAIEvaluation.error,
    triggerEvaluation: mockAIEvaluation.triggerEvaluation,
    clearEvaluation: mockAIEvaluation.clearEvaluation,
  }),
}));

const PROGRAM_ID = "program-1";

const questions = [
  {
    id: "requestedAmount",
    type: "text",
    label: "Requested amount",
    required: false,
  } as ApplicationQuestion,
];

const aiEvaluationFormSchema = {
  questions: [],
  aiConfig: { enableRealTimeEvaluation: true },
} as IFormSchema;

describe("ApplicationForm real-time evaluation payload", () => {
  beforeEach(() => {
    mockAuthState.authenticated = true;
    mockAIEvaluation.triggerEvaluation.mockReset();
    mockAIEvaluation.clearEvaluation.mockReset();
    mockAIEvaluation.triggerEvaluation.mockResolvedValue(undefined);
    mockAIEvaluation.error = null;
    window.sessionStorage.clear();
  });

  // Regression: editing an already-submitted application and re-running the
  // real-time evaluation must score the *edited* value. Previously handleScore
  // read a getValues() snapshot frozen at the last render (formState.data), and
  // RHF Controller fields don't re-render the parent on input — so it scored the
  // original submitted value instead of the new one.
  it("evaluates the latest edited field value, not the originally submitted one", async () => {
    render(
      <ApplicationForm
        programId={PROGRAM_ID}
        questions={questions}
        formSchema={aiEvaluationFormSchema}
        initialData={{ requestedAmount: "10" }}
        onSubmit={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Requested amount")).toHaveValue("10");
    });

    fireEvent.change(screen.getByLabelText("Requested amount"), {
      target: { value: "500000" },
    });

    fireEvent.click(screen.getByTestId("get-ai-feedback-btn"));

    await waitFor(() => {
      expect(mockAIEvaluation.triggerEvaluation).toHaveBeenCalledWith({
        "Requested amount": "500000",
      });
    });
  });
});
