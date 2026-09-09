import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { AIPromptConfiguration } from "@/components/QuestionBuilder/AIPromptConfiguration";
import { useAvailableAIModels } from "@/hooks/useAvailableAIModels";
import type { FormSchema } from "@/types/question-builder";

vi.mock("@/hooks/useAvailableAIModels", () => ({
  useAvailableAIModels: vi.fn(),
}));

vi.mock("@/src/features/prompt-management", () => ({
  MigrationBanner: () => null,
  PromptEditor: () => null,
  useProgramPrompts: vi.fn(),
}));

describe("AIPromptConfiguration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAvailableAIModels as vi.Mock).mockReturnValue({
      data: ["current-model"],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("preserves a persisted model that is outside the current catalog", () => {
    const schema: FormSchema = {
      id: "form-1",
      title: "Application",
      fields: [],
      settings: {
        submitButtonText: "Submit",
        confirmationMessage: "Submitted",
      },
      aiConfig: {
        aiModel: "retired-model",
        enableRealTimeEvaluation: false,
      },
    };

    render(<AIPromptConfiguration schema={schema} />);

    expect(screen.getByLabelText("Default AI Model *")).toHaveValue("retired-model");
    expect(
      screen.getByRole("option", { name: "retired-model (not currently permitted)" })
    ).toBeInTheDocument();
  });
});
