import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgramAIInsightsConfiguration } from "@/components/QuestionBuilder/ProgramAIInsightsConfiguration";

const { mockUseProgramConfig } = vi.hoisted(() => ({
  mockUseProgramConfig: vi.fn(),
}));

vi.mock("@/hooks/useFundingPlatform", () => ({
  useProgramConfig: mockUseProgramConfig,
}));

interface ConfigReturnOverrides {
  aiInsights?: string | null;
  isLoading?: boolean;
  error?: unknown;
  isUpdating?: boolean;
}

const mockUpdateConfig = vi.fn();
const mockRefetch = vi.fn();

function setConfigReturn(overrides: ConfigReturnOverrides = {}) {
  const { aiInsights = "", isLoading = false, error = null, isUpdating = false } = overrides;
  mockUseProgramConfig.mockReturnValue({
    config: { aiInsights },
    isLoading,
    error,
    updateConfig: mockUpdateConfig,
    isUpdating,
    refetch: mockRefetch,
  });
}

describe("ProgramAIInsightsConfiguration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setConfigReturn();
  });

  it("should_prefill_textarea_with_saved_aiInsights", async () => {
    setConfigReturn({ aiInsights: "Batch 1 data was imported retrospectively." });

    render(<ProgramAIInsightsConfiguration programId="785" />);

    const textarea = screen.getByLabelText("Guidance for the AI assistant") as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toBe("Batch 1 data was imported retrospectively."));
  });

  it("should_save_trimmed_value_via_updateConfig", async () => {
    const user = userEvent.setup();
    render(<ProgramAIInsightsConfiguration programId="785" />);

    const textarea = screen.getByLabelText("Guidance for the AI assistant");
    await user.type(textarea, "  Disclose Batch 1 caveat  ");
    await user.click(screen.getByRole("button", { name: /save ai insights/i }));

    await waitFor(() =>
      expect(mockUpdateConfig).toHaveBeenCalledWith(
        { aiInsights: "Disclose Batch 1 caveat" },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });

  it("should_send_null_when_cleared_to_remove_guidance", async () => {
    const user = userEvent.setup();
    setConfigReturn({ aiInsights: "Existing note" });
    render(<ProgramAIInsightsConfiguration programId="785" />);

    const textarea = screen.getByLabelText("Guidance for the AI assistant");
    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe("Existing note"));
    await user.clear(textarea);
    await user.click(screen.getByRole("button", { name: /save ai insights/i }));

    await waitFor(() =>
      expect(mockUpdateConfig).toHaveBeenCalledWith(
        { aiInsights: null },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });

  it("should_keep_form_editable_when_save_fails", async () => {
    const user = userEvent.setup();
    // updateConfig never invokes its onSuccess callback → simulates a failed
    // save. The form must stay dirty so the admin can retry.
    render(<ProgramAIInsightsConfiguration programId="785" />);

    const textarea = screen.getByLabelText("Guidance for the AI assistant");
    await user.type(textarea, "Retryable note");
    const saveButton = screen.getByRole("button", { name: /save ai insights/i });
    await user.click(saveButton);

    expect(saveButton).toBeEnabled();
    expect((textarea as HTMLTextAreaElement).value).toBe("Retryable note");
  });

  it("should_render_skeleton_while_loading", () => {
    setConfigReturn({ isLoading: true });
    render(<ProgramAIInsightsConfiguration programId="785" />);

    expect(screen.queryByLabelText("Guidance for the AI assistant")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save ai insights/i })).not.toBeInTheDocument();
  });

  it("should_render_retry_on_error_and_call_refetch", async () => {
    const user = userEvent.setup();
    setConfigReturn({ error: new Error("boom") });
    render(<ProgramAIInsightsConfiguration programId="785" />);

    const retry = screen.getByRole("button", { name: /try again/i });
    await user.click(retry);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("should_hide_save_button_in_readOnly_mode", () => {
    setConfigReturn({ aiInsights: "Note" });
    render(<ProgramAIInsightsConfiguration programId="785" readOnly />);

    expect(screen.queryByRole("button", { name: /save ai insights/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Guidance for the AI assistant")).toBeDisabled();
  });
});
