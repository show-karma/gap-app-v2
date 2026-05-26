import * as Sentry from "@sentry/nextjs";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import type { ApplicationQuestion, IFormSchema } from "@/types/whitelabel-entities";
import { ApplicationForm } from "../ApplicationForm";

const mockAuthState = vi.hoisted(() => ({
  authenticated: false,
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
const FORM_STORAGE_KEY = `gap:application-form-auth:${PROGRAM_ID}:default`;
const DRAFT_SAVE_DEBOUNCE_MS = 300;
const FORM_AUTH_PERSISTENCE_TTL_MS = 30 * 60 * 1000;

function createMockQuestion(overrides: Partial<ApplicationQuestion> = {}): ApplicationQuestion {
  return {
    id: "projectName",
    type: "text",
    label: "Project name",
    required: false,
    ...overrides,
  } as ApplicationQuestion;
}

const questions = [createMockQuestion()];

const aiEvaluationFormSchema = {
  questions: [],
  aiConfig: { enableRealTimeEvaluation: true },
} as IFormSchema;

describe("ApplicationForm auth persistence", () => {
  beforeEach(() => {
    mockAuthState.authenticated = false;
    mockAuthState.login.mockReset();
    mockAIEvaluation.triggerEvaluation.mockReset();
    mockAIEvaluation.clearEvaluation.mockReset();
    mockAIEvaluation.triggerEvaluation.mockResolvedValue(undefined);
    mockAIEvaluation.error = null;
    window.sessionStorage.clear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(Sentry.captureException).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("saves an unauthenticated draft as the applicant fills the form", async () => {
    vi.useFakeTimers();
    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network" },
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS);
    });

    const raw = window.sessionStorage.getItem(FORM_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const saved = JSON.parse(raw as string);
    expect(saved.formData).toEqual({ projectName: "Builder Network" });
    expect(saved.shouldAutoSubmit).toBe(false);
  });

  it("restores an unauthenticated draft after the applicant logs in and the form remounts", async () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network" },
    });

    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS);
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).not.toBeNull();

    unmount();
    vi.useRealTimers();
    mockAuthState.authenticated = true;

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Project name")).toHaveValue("Builder Network");
    });
  });

  it("flushes a pending debounced draft when the form unmounts", () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Fast Login Project" },
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();

    unmount();

    const raw = window.sessionStorage.getItem(FORM_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).formData).toEqual({
      projectName: "Fast Login Project",
    });
  });

  it("clears the unauthenticated draft after the applicant erases the form", async () => {
    vi.useFakeTimers();
    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network" },
    });

    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS);
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).not.toBeNull();

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "" },
    });

    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS);
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();
  });

  it("keeps pending-submit intent when the applicant edits after submit starts login", async () => {
    vi.useFakeTimers();
    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("application-form"));
      await Promise.resolve();
    });

    const pendingSubmitDraft = JSON.parse(
      window.sessionStorage.getItem(FORM_STORAGE_KEY) as string
    );
    expect(pendingSubmitDraft.shouldAutoSubmit).toBe(true);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network Updated" },
    });

    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS);
    });

    const saved = JSON.parse(window.sessionStorage.getItem(FORM_STORAGE_KEY) as string);
    expect(saved.formData).toEqual({ projectName: "Builder Network Updated" });
    expect(saved.shouldAutoSubmit).toBe(true);
  });

  it("keeps pending-submit intent when the applicant erases after submit starts login", async () => {
    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("application-form"));
    });

    await waitFor(() => {
      const saved = JSON.parse(window.sessionStorage.getItem(FORM_STORAGE_KEY) as string);
      expect(saved.shouldAutoSubmit).toBe(true);
    });

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "" },
    });

    await waitFor(() => {
      const saved = JSON.parse(window.sessionStorage.getItem(FORM_STORAGE_KEY) as string);
      expect(saved.formData).toEqual({ projectName: "" });
      expect(saved.shouldAutoSubmit).toBe(true);
    });
  });

  it("auto-submits a saved pending submission after login", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    window.sessionStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({
        formData: { projectName: "Builder Network" },
        shouldAutoSubmit: true,
        createdAt: Date.now(),
      })
    );
    mockAuthState.authenticated = true;

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={onSubmit} />);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ "Project name": "Builder Network" }, undefined);
    });
    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();
  });

  it("keeps the saved draft and logs when submission fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Submit failed"));
    window.sessionStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({
        formData: { projectName: "Builder Network" },
        shouldAutoSubmit: false,
        createdAt: Date.now(),
      })
    );
    mockAuthState.authenticated = true;

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={onSubmit} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Project name")).toHaveValue("Builder Network");
    });

    fireEvent.click(screen.getByTestId("submit-application-btn"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't submit your application. Your form data is still here."
      );
    });
    expect(Sentry.captureException).toHaveBeenCalled();
    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).not.toBeNull();
  });

  it("clears expired saved drafts instead of restoring them", async () => {
    window.sessionStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({
        formData: { projectName: "Expired Project" },
        shouldAutoSubmit: false,
        createdAt: Date.now() - FORM_AUTH_PERSISTENCE_TTL_MS - 1,
      })
    );

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    await waitFor(() => {
      expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();
    });
    expect(screen.getByLabelText("Project name")).toHaveValue("");
  });

  it("clears corrupted saved drafts instead of restoring them", async () => {
    window.sessionStorage.setItem(FORM_STORAGE_KEY, "{not-json");

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    await waitFor(() => {
      expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();
    });
    expect(screen.getByLabelText("Project name")).toHaveValue("");
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("logs and warns when reading the saved draft fails on mount", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    expect(Sentry.captureException).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "We couldn't save your draft in this browser. Please submit before leaving."
    );
  });

  it("shows feedback and logs when login fails", async () => {
    mockAuthState.login.mockRejectedValueOnce(new Error("Popup blocked"));

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /login to submit/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't start login. Please check your wallet and try again."
      );
    });
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("unlocks the submit path so applicants are not soft-locked when AI feedback fails", async () => {
    mockAuthState.authenticated = true;
    mockAIEvaluation.triggerEvaluation.mockRejectedValueOnce(new Error("AI start failed"));

    render(
      <ApplicationForm
        programId={PROGRAM_ID}
        questions={questions}
        formSchema={aiEvaluationFormSchema}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network" },
    });
    fireEvent.click(screen.getByTestId("get-ai-feedback-btn"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't start AI feedback. You can try again or submit without it."
      );
    });
    expect(Sentry.captureException).toHaveBeenCalled();
    expect(await screen.findByTestId("submit-application-btn")).toBeInTheDocument();
    expect(screen.getByTestId("rescore-btn")).toBeInTheDocument();
  });

  it("warns once when the draft cannot be saved", async () => {
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network" },
    });

    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS);
    });

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network 2" },
    });

    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS);
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("renders the outer evaluation-error banner when the hook reports an error", async () => {
    mockAuthState.authenticated = true;
    mockAIEvaluation.error =
      "AI feedback is unavailable right now. You can submit your application without it.";

    render(
      <ApplicationForm
        programId={PROGRAM_ID}
        questions={questions}
        formSchema={aiEvaluationFormSchema}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network" },
    });
    fireEvent.click(screen.getByTestId("get-ai-feedback-btn"));

    expect(await screen.findByText("AI feedback did not finish")).toBeInTheDocument();
    expect(
      screen.getByText(
        "AI feedback is unavailable right now. You can submit your application without it."
      )
    ).toBeInTheDocument();
  });

  it("keeps the draft persisted until the slow submit resolves, then clears it", async () => {
    vi.useFakeTimers();
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );
    window.sessionStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({
        formData: { projectName: "Builder Network" },
        shouldAutoSubmit: true,
        createdAt: Date.now(),
      })
    );
    mockAuthState.authenticated = true;

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={onSubmit} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalled();
    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).not.toBeNull();

    await act(async () => {
      resolveSubmit?.();
      await Promise.resolve();
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();
  });

  it("resets pendingSubmitRef and keeps the saved draft when an authenticated submission fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Submit failed"));
    window.sessionStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({
        formData: { projectName: "Builder Network" },
        shouldAutoSubmit: true,
        createdAt: Date.now(),
      })
    );
    mockAuthState.authenticated = true;

    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={onSubmit} />);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't submit your application. Your form data is still here."
      );
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).not.toBeNull();

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Edited After Failure" },
    });

    onSubmit.mockClear();
    fireEvent.click(screen.getByTestId("submit-application-btn"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it("clears the persisted draft when the user cancels the login dialog", async () => {
    render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Builder Network" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("application-form"));
    });

    await waitFor(() => {
      expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).not.toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();
    });
  });

  it("surfaces a toast when auto-submit cannot fire because requestSubmit is unavailable", async () => {
    const originalRequestSubmit = HTMLFormElement.prototype.requestSubmit;
    Object.defineProperty(HTMLFormElement.prototype, "requestSubmit", {
      configurable: true,
      value: undefined,
    });

    window.sessionStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({
        formData: { projectName: "Builder Network" },
        shouldAutoSubmit: true,
        createdAt: Date.now(),
      })
    );
    mockAuthState.authenticated = true;

    try {
      render(<ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Couldn't auto-submit your application. Please click Submit again."
        );
      });
      expect(Sentry.captureException).toHaveBeenCalled();
    } finally {
      Object.defineProperty(HTMLFormElement.prototype, "requestSubmit", {
        configurable: true,
        value: originalRequestSubmit,
      });
    }
  });

  it("clears the draft on unmount when the user erased the form before the debounce fired", async () => {
    window.sessionStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({
        formData: { projectName: "Builder Network" },
        shouldAutoSubmit: false,
        createdAt: Date.now(),
      })
    );

    const { unmount } = render(
      <ApplicationForm programId={PROGRAM_ID} questions={questions} onSubmit={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Project name")).toHaveValue("Builder Network");
    });

    vi.useFakeTimers();

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "" },
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).not.toBeNull();

    unmount();

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();
  });

  it("persists drafts whose meaningful values live inside nested objects", async () => {
    vi.useFakeTimers();
    const nestedQuestion = createMockQuestion({
      id: "projectMeta",
      type: "text",
      label: "Project meta",
    });

    function Wrapper() {
      return (
        <ApplicationForm
          programId={PROGRAM_ID}
          questions={[nestedQuestion]}
          onSubmit={vi.fn()}
          initialData={{ projectMeta: { details: { name: "" } } }}
        />
      );
    }
    render(<Wrapper />);

    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS);
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).toBeNull();

    fireEvent.change(screen.getByLabelText("Project meta"), {
      target: { value: "Has value" },
    });

    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVE_DEBOUNCE_MS);
    });

    expect(window.sessionStorage.getItem(FORM_STORAGE_KEY)).not.toBeNull();
  });
});
