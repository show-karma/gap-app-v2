import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import { PromptEditor } from "@/features/prompt-management/components/PromptEditor";
import {
  useSavePrompt,
  useTestPrompt,
  useTriggerBulkEvaluation,
} from "@/features/prompt-management/hooks/use-program-prompts";
import type { ProgramPrompt } from "@/features/prompt-management/types/program-prompt";
import { useAvailableAIModels } from "@/hooks/useAvailableAIModels";

// Mock hooks
jest.mock("@/features/prompt-management/hooks/use-program-prompts", () => ({
  useSavePrompt: jest.fn(),
  useTestPrompt: jest.fn(),
  useTriggerBulkEvaluation: jest.fn(),
}));

jest.mock("@/hooks/useAvailableAIModels", () => ({
  useAvailableAIModels: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock MarkdownEditor
jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({
    value,
    onChange,
    label,
    placeholder,
    isDisabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    isDisabled?: boolean;
  }) => (
    <div data-testid="markdown-editor">
      <label htmlFor="mock-md-editor">{label}</label>
      <textarea
        id="mock-md-editor"
        data-testid="markdown-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={isDisabled}
      />
    </div>
  ),
}));

// Mock BulkEvaluationProgress
jest.mock("@/features/prompt-management/components/BulkEvaluationProgress", () => ({
  BulkEvaluationProgress: () => <div data-testid="bulk-evaluation-progress" />,
}));

// Mock PromptTestPanel
jest.mock("@/features/prompt-management/components/PromptTestPanel", () => ({
  PromptTestPanel: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="prompt-test-panel">Test Panel</div> : null,
}));

describe("PromptEditor", () => {
  const mockSavePrompt = jest.fn();
  const mockTestPrompt = jest.fn();
  const mockTriggerBulkEvaluation = jest.fn();

  const defaultProps = {
    programId: "program-123",
    promptType: "external" as const,
    existingPrompt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useAvailableAIModels as jest.Mock).mockReturnValue({
      data: ["gpt-4", "gpt-3.5-turbo", "claude-3-opus"],
      isLoading: false,
    });

    (useSavePrompt as jest.Mock).mockReturnValue({
      mutate: mockSavePrompt,
      isPending: false,
    });

    (useTestPrompt as jest.Mock).mockReturnValue({
      mutate: mockTestPrompt,
      isPending: false,
    });

    (useTriggerBulkEvaluation as jest.Mock).mockReturnValue({
      mutate: mockTriggerBulkEvaluation,
      isPending: false,
    });
  });

  describe("Rendering", () => {
    it("should render all form fields", () => {
      render(<PromptEditor {...defaultProps} />);

      expect(screen.getByLabelText(/Prompt Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/AI Model/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/System Message/i)).toBeInTheDocument();
      expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
    });

    it("should render available AI models in dropdown", () => {
      render(<PromptEditor {...defaultProps} />);

      const modelSelect = screen.getByLabelText(/AI Model/i);
      expect(modelSelect).toBeInTheDocument();

      // Check options
      expect(screen.getByText("gpt-4")).toBeInTheDocument();
      expect(screen.getByText("gpt-3.5-turbo")).toBeInTheDocument();
      expect(screen.getByText("claude-3-opus")).toBeInTheDocument();
    });

    it("should show Create Prompt button for new prompt", () => {
      render(<PromptEditor {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Create Prompt/i })).toBeInTheDocument();
    });

    it("should show Save Changes button for existing prompt", () => {
      const existingPrompt: ProgramPrompt = {
        id: "prompt-123",
        programId: "program-123",
        promptType: "external",
        name: "existing-prompt",
        systemMessage: null,
        content: "Existing content",
        modelId: "gpt-4",
        langfusePromptId: "langfuse-123",
        langfuseVersion: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "0x123",
        updatedBy: "0x123",
      };

      render(<PromptEditor {...defaultProps} existingPrompt={existingPrompt} />);

      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
    });

    it("should show Test Prompt button when prompt exists and not dirty", () => {
      const existingPrompt: ProgramPrompt = {
        id: "prompt-123",
        programId: "program-123",
        promptType: "external",
        name: "existing-prompt",
        systemMessage: null,
        content: "Existing content",
        modelId: "gpt-4",
        langfusePromptId: "langfuse-123",
        langfuseVersion: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "0x123",
        updatedBy: "0x123",
      };

      render(<PromptEditor {...defaultProps} existingPrompt={existingPrompt} />);

      expect(screen.getByRole("button", { name: /Test Prompt/i })).toBeInTheDocument();
    });

    it("should show Evaluate All Applications button for existing prompt", () => {
      const existingPrompt: ProgramPrompt = {
        id: "prompt-123",
        programId: "program-123",
        promptType: "internal",
        name: "internal-prompt",
        systemMessage: null,
        content: "Content",
        modelId: "gpt-4",
        langfusePromptId: "langfuse-123",
        langfuseVersion: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "0x123",
        updatedBy: "0x123",
      };

      render(
        <PromptEditor {...defaultProps} promptType="internal" existingPrompt={existingPrompt} />
      );

      expect(
        screen.getByRole("button", { name: /Evaluate All Applications/i })
      ).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should disable save button when name is empty", () => {
      render(<PromptEditor {...defaultProps} />);

      // Fill content but leave name empty
      const textarea = screen.getByTestId("markdown-textarea");
      fireEvent.change(textarea, { target: { value: "Some content with json" } });

      const saveButton = screen.getByRole("button", { name: /Create Prompt/i });
      expect(saveButton).toBeDisabled();
    });

    it("should disable save button when content is empty", () => {
      render(<PromptEditor {...defaultProps} />);

      // Fill name but leave content empty
      const nameInput = screen.getByLabelText(/Prompt Name/i);
      fireEvent.change(nameInput, { target: { value: "test-prompt" } });

      const saveButton = screen.getByRole("button", { name: /Create Prompt/i });
      expect(saveButton).toBeDisabled();
    });

    it("should enable save button when both name and content are filled", () => {
      render(<PromptEditor {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Prompt Name/i);
      fireEvent.change(nameInput, { target: { value: "test-prompt" } });

      const textarea = screen.getByTestId("markdown-textarea");
      fireEvent.change(textarea, { target: { value: "Content with json" } });

      const saveButton = screen.getByRole("button", { name: /Create Prompt/i });
      expect(saveButton).toBeEnabled();
    });

    it("should show error when json is not in prompt", async () => {
      render(<PromptEditor {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Prompt Name/i);
      fireEvent.change(nameInput, { target: { value: "test-prompt" } });

      const textarea = screen.getByTestId("markdown-textarea");
      fireEvent.change(textarea, { target: { value: "Content without the j word" } });

      const saveButton = screen.getByRole("button", { name: /Create Prompt/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("json"));
      });
    });
  });

  describe("Saving Prompt", () => {
    it("should call save mutation with correct data", async () => {
      render(<PromptEditor {...defaultProps} />);

      // Fill form
      const nameInput = screen.getByLabelText(/Prompt Name/i);
      fireEvent.change(nameInput, { target: { value: "my-prompt" } });

      const systemMessageInput = screen.getByLabelText(/System Message/i);
      fireEvent.change(systemMessageInput, {
        target: { value: "You are a helpful assistant" },
      });

      const textarea = screen.getByTestId("markdown-textarea");
      fireEvent.change(textarea, {
        target: { value: "Evaluate in json format" },
      });

      const saveButton = screen.getByRole("button", { name: /Create Prompt/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSavePrompt).toHaveBeenCalledWith({
          name: "my-prompt",
          systemMessage: "You are a helpful assistant",
          content: "Evaluate in json format",
          modelId: "gpt-4",
        });
      });
    });

    it("should not include systemMessage if empty", async () => {
      render(<PromptEditor {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Prompt Name/i);
      fireEvent.change(nameInput, { target: { value: "my-prompt" } });

      const textarea = screen.getByTestId("markdown-textarea");
      fireEvent.change(textarea, {
        target: { value: "Evaluate in json format" },
      });

      const saveButton = screen.getByRole("button", { name: /Create Prompt/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSavePrompt).toHaveBeenCalledWith({
          name: "my-prompt",
          systemMessage: undefined,
          content: "Evaluate in json format",
          modelId: "gpt-4",
        });
      });
    });
  });

  describe("Existing Prompt", () => {
    it("should populate form with existing prompt data", () => {
      const existingPrompt: ProgramPrompt = {
        id: "prompt-123",
        programId: "program-123",
        promptType: "external",
        name: "existing-prompt",
        systemMessage: "System message here",
        content: "Existing content",
        modelId: "gpt-3.5-turbo",
        langfusePromptId: "langfuse-123",
        langfuseVersion: 3,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        createdBy: "0x123",
        updatedBy: "0x456",
      };

      render(<PromptEditor {...defaultProps} existingPrompt={existingPrompt} />);

      expect(screen.getByLabelText(/Prompt Name/i)).toHaveValue("existing-prompt");
      expect(screen.getByLabelText(/System Message/i)).toHaveValue("System message here");
      expect(screen.getByTestId("markdown-textarea")).toHaveValue("Existing content");
      expect(screen.getByLabelText(/AI Model/i)).toHaveValue("gpt-3.5-turbo");
    });

    it("should disable name field for existing prompt", () => {
      const existingPrompt: ProgramPrompt = {
        id: "prompt-123",
        programId: "program-123",
        promptType: "external",
        name: "existing-prompt",
        systemMessage: null,
        content: "Content",
        modelId: "gpt-4",
        langfusePromptId: "langfuse-123",
        langfuseVersion: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "0x123",
        updatedBy: "0x123",
      };

      render(<PromptEditor {...defaultProps} existingPrompt={existingPrompt} />);

      expect(screen.getByLabelText(/Prompt Name/i)).toBeDisabled();
    });

    it("should show Langfuse version for existing prompt", () => {
      const existingPrompt: ProgramPrompt = {
        id: "prompt-123",
        programId: "program-123",
        promptType: "external",
        name: "existing-prompt",
        systemMessage: null,
        content: "Content",
        modelId: "gpt-4",
        langfusePromptId: "langfuse-123",
        langfuseVersion: 5,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "0x123",
        updatedBy: "0x123",
      };

      render(<PromptEditor {...defaultProps} existingPrompt={existingPrompt} />);

      expect(screen.getByText(/Langfuse Version:/i)).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  describe("Dirty State", () => {
    it("should show unsaved changes warning when dirty", () => {
      render(<PromptEditor {...defaultProps} />);

      const textarea = screen.getByTestId("markdown-textarea");
      fireEvent.change(textarea, { target: { value: "New content" } });

      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    it("should hide Test Prompt button when dirty", () => {
      const existingPrompt: ProgramPrompt = {
        id: "prompt-123",
        programId: "program-123",
        promptType: "external",
        name: "existing-prompt",
        systemMessage: null,
        content: "Content",
        modelId: "gpt-4",
        langfusePromptId: "langfuse-123",
        langfuseVersion: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "0x123",
        updatedBy: "0x123",
      };

      render(<PromptEditor {...defaultProps} existingPrompt={existingPrompt} />);

      // Initially Test Prompt should be visible
      expect(screen.getByRole("button", { name: /Test Prompt/i })).toBeInTheDocument();

      // Make form dirty
      const textarea = screen.getByTestId("markdown-textarea");
      fireEvent.change(textarea, { target: { value: "Modified content" } });

      // Test Prompt should be hidden
      expect(screen.queryByRole("button", { name: /Test Prompt/i })).not.toBeInTheDocument();
    });
  });

  describe("Read Only Mode", () => {
    it("should disable all inputs when readOnly", () => {
      render(<PromptEditor {...defaultProps} readOnly={true} />);

      expect(screen.getByLabelText(/Prompt Name/i)).toBeDisabled();
      expect(screen.getByLabelText(/System Message/i)).toBeDisabled();
      expect(screen.getByLabelText(/AI Model/i)).toBeDisabled();
    });
  });

  describe("Legacy Prompt Info", () => {
    it("should show legacy prompt banner when legacyPromptId provided for new prompt", () => {
      render(
        <PromptEditor {...defaultProps} existingPrompt={null} legacyPromptId="legacy-langfuse-id" />
      );

      expect(screen.getByText(/Legacy Langfuse Prompt/i)).toBeInTheDocument();
      expect(screen.getByText("legacy-langfuse-id")).toBeInTheDocument();
    });
  });
});
