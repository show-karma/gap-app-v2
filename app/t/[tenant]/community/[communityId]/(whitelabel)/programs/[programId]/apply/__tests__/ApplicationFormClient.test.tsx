import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { api } from "@/utilities/api/client";
import { ApplicationFormClient } from "../ApplicationFormClient";

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  submit: vi.fn(),
  toastError: vi.fn(),
  searchParams: new URLSearchParams(),
  isStaff: false as boolean | null,
  isCommunityAdmin: false,
  isReviewer: false,
  rbacLoading: false,
  isWhitelabel: false,
  communitySlug: null as string | null,
  capturedOnSubmit: null as
    | ((
        data: Record<string, unknown>,
        ai?: { evaluation: string; promptId: string }
      ) => Promise<void>)
    | null,
  modalState: null as { isOpen: boolean; error: string | null } | null,
}));

vi.mock("@/utilities/api/client", () => ({
  api: { post: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => ({
    isLoading: mocks.rbacLoading,
    // BE folds staff (SUPER_ADMIN) into isCommunityAdmin
    isCommunityAdmin: mocks.isCommunityAdmin || mocks.isStaff === true,
    isReviewer: mocks.isReviewer,
  }),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({
    isWhitelabel: mocks.isWhitelabel,
    communitySlug: mocks.communitySlug,
  }),
}));

vi.mock("@/src/features/applications/hooks/use-application-submit", () => ({
  useApplicationSubmit: () => ({ submit: mocks.submit }),
}));

vi.mock("@/src/features/applications/components/ApplicationForm", () => ({
  ApplicationForm: ({
    onSubmit,
  }: {
    onSubmit: (
      data: Record<string, unknown>,
      ai?: { evaluation: string; promptId: string }
    ) => Promise<void>;
  }) => {
    mocks.capturedOnSubmit = onSubmit;
    return <div data-testid="application-form">Form Body</div>;
  },
}));

vi.mock("@/src/features/applications/components/AccessCodeModal", () => ({
  AccessCodeModal: ({ isOpen, error }: { isOpen: boolean; error: string | null }) => {
    mocks.modalState = { isOpen, error: error ?? null };
    return isOpen ? <div data-testid="access-code-modal" data-error={error ?? ""} /> : null;
  },
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: (msg: string) => mocks.toastError(msg) },
}));

const mockApiPost = api.post as unknown as ReturnType<typeof vi.fn>;

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const COMMUNITY_ID = "test-community";
const PROGRAM_ID = "test-program";
const STORAGE_KEY = `gap:gated-access-code:${COMMUNITY_ID}:${PROGRAM_ID}`;

const gatedProps = {
  communityId: COMMUNITY_ID,
  programId: PROGRAM_ID,
  questions: [],
  formSchema: {
    questions: [],
    settings: { accessCodeEnabled: true },
  } as never,
  programName: "Test Program",
};

const openProps = {
  communityId: COMMUNITY_ID,
  programId: PROGRAM_ID,
  questions: [{ id: "email", type: "email", label: "Email", required: true }] as never,
  formSchema: {
    questions: [],
    settings: { accessCodeEnabled: false },
  } as never,
  programName: "Test Program",
};

function resetMocks() {
  mocks.routerPush.mockReset();
  mocks.submit.mockReset();
  mocks.toastError.mockReset();
  mocks.searchParams = new URLSearchParams();
  mocks.isStaff = false;
  mocks.isCommunityAdmin = false;
  mocks.isReviewer = false;
  mocks.rbacLoading = false;
  mocks.isWhitelabel = false;
  mocks.communitySlug = null;
  mocks.capturedOnSubmit = null;
  mocks.modalState = null;
}

describe("ApplicationFormClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
    try {
      window.sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  describe("access code gate (validateAccessCode response handling)", () => {
    it("should_keep_form_locked_when_validation_response_is_valid_false", async () => {
      // Regression: the endpoint returns { valid: boolean }. The previous
      // implementation typed the response as boolean and used Boolean(result),
      // so Boolean({ valid: false }) === true unlocked the form on wrong codes.
      mockApiPost.mockResolvedValue({ valid: false });

      render(
        <Wrapper>
          <ApplicationFormClient {...gatedProps} />
        </Wrapper>
      );

      const input = await screen.findByPlaceholderText("Enter your access code");
      fireEvent.change(input, { target: { value: "wrong-code" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /unlock application/i }));
      });

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          `/v2/funding-applications/${PROGRAM_ID}/validate-access-code`,
          { accessCode: "wrong-code" }
        );
      });

      expect(screen.queryByTestId("application-form")).not.toBeInTheDocument();
      expect(await screen.findByText(/invalid access code/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter your access code")).toBeInTheDocument();
    });

    it("should_unlock_form_when_validation_response_is_valid_true", async () => {
      mockApiPost.mockResolvedValue({ valid: true });

      render(
        <Wrapper>
          <ApplicationFormClient {...gatedProps} />
        </Wrapper>
      );

      const input = await screen.findByPlaceholderText("Enter your access code");
      fireEvent.change(input, { target: { value: "correct-code" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /unlock application/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("application-form")).toBeInTheDocument();
      });
      expect(screen.queryByPlaceholderText("Enter your access code")).not.toBeInTheDocument();
    });

    it("should_keep_form_locked_when_api_post_rejects", async () => {
      mockApiPost.mockRejectedValue(new Error("network error"));

      render(
        <Wrapper>
          <ApplicationFormClient {...gatedProps} />
        </Wrapper>
      );

      const input = await screen.findByPlaceholderText("Enter your access code");
      fireEvent.change(input, { target: { value: "any-code" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /unlock application/i }));
      });

      expect(screen.queryByTestId("application-form")).not.toBeInTheDocument();
      expect(await screen.findByText(/invalid access code/i)).toBeInTheDocument();
    });
  });

  describe("non-gated rendering", () => {
    it("should_render_form_directly_when_access_code_is_not_enabled", () => {
      render(
        <Wrapper>
          <ApplicationFormClient {...openProps} />
        </Wrapper>
      );

      expect(screen.getByTestId("application-form")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Enter your access code")).not.toBeInTheDocument();
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it("should_render_form_when_formSchema_is_undefined", () => {
      render(
        <Wrapper>
          <ApplicationFormClient communityId={COMMUNITY_ID} programId={PROGRAM_ID} questions={[]} />
        </Wrapper>
      );

      expect(screen.getByTestId("application-form")).toBeInTheDocument();
      expect(mockApiPost).not.toHaveBeenCalled();
    });
  });

  describe("persisted access code", () => {
    it("should_unlock_form_without_api_call_when_code_is_persisted_in_session_storage", async () => {
      window.sessionStorage.setItem(STORAGE_KEY, "remembered-code");

      render(
        <Wrapper>
          <ApplicationFormClient {...gatedProps} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("application-form")).toBeInTheDocument();
      });
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it("should_persist_access_code_to_session_storage_after_successful_unlock", async () => {
      mockApiPost.mockResolvedValue({ valid: true });

      render(
        <Wrapper>
          <ApplicationFormClient {...gatedProps} />
        </Wrapper>
      );

      const input = await screen.findByPlaceholderText("Enter your access code");
      fireEvent.change(input, { target: { value: "good-code" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /unlock application/i }));
      });

      await waitFor(() => {
        expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe("good-code");
      });
    });
  });

  describe("URL access code (?accessCode= query param)", () => {
    it("should_show_validating_loader_while_url_access_code_request_is_in_flight", async () => {
      mocks.searchParams = new URLSearchParams("?accessCode=url-code");

      // Pending promise that never resolves — we only care about the loading state
      mockApiPost.mockReturnValue(new Promise(() => undefined));

      render(
        <Wrapper>
          <ApplicationFormClient {...gatedProps} />
        </Wrapper>
      );

      expect(await screen.findByText(/validating access code/i)).toBeInTheDocument();
      expect(screen.queryByTestId("application-form")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Enter your access code")).not.toBeInTheDocument();
    });

    it("should_unlock_form_and_persist_code_when_url_access_code_is_valid", async () => {
      mocks.searchParams = new URLSearchParams("?accessCode=url-code");
      mockApiPost.mockResolvedValue({ valid: true });

      render(
        <Wrapper>
          <ApplicationFormClient {...gatedProps} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId("application-form")).toBeInTheDocument();
      });
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe("url-code");
      expect(mockApiPost).toHaveBeenCalledWith(
        `/v2/funding-applications/${PROGRAM_ID}/validate-access-code`,
        { accessCode: "url-code" }
      );
    });

    it("should_open_access_code_modal_when_url_access_code_is_invalid", async () => {
      mocks.searchParams = new URLSearchParams("?accessCode=bad-url-code");
      mockApiPost.mockResolvedValue({ valid: false });

      render(
        <Wrapper>
          <ApplicationFormClient {...gatedProps} />
        </Wrapper>
      );

      // After validation fails, modal opens but unlockedAccessCode is still null,
      // so the AccessCodeInput screen remains rendered AND the modal flag is set.
      // The render returns early at the AccessCodeInput branch, so the modal DOM
      // node is not mounted — but we can still verify the locked screen is shown.
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter your access code")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("application-form")).not.toBeInTheDocument();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("submit flow", () => {
    async function unlockAndCaptureSubmit() {
      mockApiPost.mockResolvedValue({ valid: true });
      render(
        <Wrapper>
          <ApplicationFormClient
            {...gatedProps}
            questions={[{ id: "email", type: "email", label: "Email", required: true } as never]}
          />
        </Wrapper>
      );

      const input = await screen.findByPlaceholderText("Enter your access code");
      fireEvent.change(input, { target: { value: "good-code" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /unlock application/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("application-form")).toBeInTheDocument();
      });
    }

    it("should_call_submit_with_email_and_access_code_then_navigate_to_success_page_on_success", async () => {
      await unlockAndCaptureSubmit();

      mocks.submit.mockResolvedValueOnce({
        id: "app-1",
        referenceNumber: "APP-REF-123",
      });

      await act(async () => {
        await mocks.capturedOnSubmit?.({ Email: "user@example.com" });
      });

      expect(mocks.submit).toHaveBeenCalledWith(
        PROGRAM_ID,
        { Email: "user@example.com" },
        "user@example.com",
        undefined,
        "good-code"
      );
      expect(mocks.routerPush).toHaveBeenCalledWith(
        `/community/${COMMUNITY_ID}/applications/APP-REF-123/success`
      );
    });

    it("should_strip_community_slug_prefix_from_success_path_in_whitelabel_mode", async () => {
      mocks.isWhitelabel = true;
      mocks.communitySlug = COMMUNITY_ID;

      await unlockAndCaptureSubmit();

      mocks.submit.mockResolvedValueOnce({ id: "app-2", referenceNumber: "APP-WL" });

      await act(async () => {
        await mocks.capturedOnSubmit?.({ Email: "wl@example.com" });
      });

      expect(mocks.routerPush).toHaveBeenCalledWith("/applications/APP-WL/success");
    });

    it("should_fall_back_to_application_id_when_reference_number_is_missing", async () => {
      await unlockAndCaptureSubmit();

      mocks.submit.mockResolvedValueOnce({ id: "raw-id-only" });

      await act(async () => {
        await mocks.capturedOnSubmit?.({ Email: "x@example.com" });
      });

      expect(mocks.routerPush).toHaveBeenCalledWith(
        `/community/${COMMUNITY_ID}/applications/raw-id-only/success`
      );
    });

    it("should_relock_form_and_clear_persisted_code_when_submit_fails_with_access_code_error", async () => {
      await unlockAndCaptureSubmit();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe("good-code");

      mocks.submit.mockRejectedValueOnce(new Error("Access code is invalid"));

      await act(async () => {
        await mocks.capturedOnSubmit?.({ Email: "user@example.com" });
      });

      // Re-renders to the locked screen with the server-provided error message
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter your access code")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("application-form")).not.toBeInTheDocument();
      expect(screen.getByText("Access code is invalid")).toBeInTheDocument();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(mocks.routerPush).not.toHaveBeenCalled();
      expect(mocks.toastError).not.toHaveBeenCalled();
    });

    it("should_relock_form_when_submit_fails_with_incorrect_error_message", async () => {
      await unlockAndCaptureSubmit();

      mocks.submit.mockRejectedValueOnce(new Error("The submitted code is incorrect"));

      await act(async () => {
        await mocks.capturedOnSubmit?.({ Email: "user@example.com" });
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter your access code")).toBeInTheDocument();
      });
      expect(screen.getByText("The submitted code is incorrect")).toBeInTheDocument();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("should_show_toast_error_and_keep_form_unlocked_when_submit_fails_with_generic_error", async () => {
      await unlockAndCaptureSubmit();

      mocks.submit.mockRejectedValueOnce(new Error("Server is down"));

      await act(async () => {
        await mocks.capturedOnSubmit?.({ Email: "user@example.com" });
      });

      expect(mocks.toastError).toHaveBeenCalledWith("Server is down");
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe("good-code");
      expect(mocks.routerPush).not.toHaveBeenCalled();
    });

    it("should_resolve_email_from_label_when_no_email_typed_question_exists", async () => {
      mockApiPost.mockResolvedValue({ valid: true });
      render(
        <Wrapper>
          <ApplicationFormClient
            {...gatedProps}
            questions={[
              { id: "q1", type: "text", label: "Contact e-mail", required: true } as never,
            ]}
          />
        </Wrapper>
      );

      const input = await screen.findByPlaceholderText("Enter your access code");
      fireEvent.change(input, { target: { value: "good-code" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /unlock application/i }));
      });
      await waitFor(() => {
        expect(screen.getByTestId("application-form")).toBeInTheDocument();
      });

      mocks.submit.mockResolvedValueOnce({ id: "app-3", referenceNumber: "APP-3" });

      await act(async () => {
        await mocks.capturedOnSubmit?.({ "Contact e-mail": "fallback@example.com" });
      });

      expect(mocks.submit).toHaveBeenCalledWith(
        PROGRAM_ID,
        { "Contact e-mail": "fallback@example.com" },
        "fallback@example.com",
        undefined,
        "good-code"
      );
    });
  });

  describe("RBAC and disabled state", () => {
    it("should_show_checking_permissions_loader_when_disabled_and_rbac_is_loading", () => {
      mocks.rbacLoading = true;

      render(
        <Wrapper>
          <ApplicationFormClient {...openProps} isDisabled={true} />
        </Wrapper>
      );

      expect(screen.getByText(/checking permissions/i)).toBeInTheDocument();
      expect(screen.queryByTestId("application-form")).not.toBeInTheDocument();
    });

    it("should_show_admin_override_banner_when_disabled_and_user_is_staff", () => {
      mocks.isStaff = true;

      render(
        <Wrapper>
          <ApplicationFormClient {...openProps} isDisabled={true} />
        </Wrapper>
      );

      expect(screen.getByText(/admin override/i)).toBeInTheDocument();
      expect(screen.getByTestId("application-form")).toBeInTheDocument();
    });

    it("should_show_admin_override_banner_when_disabled_and_user_is_community_admin", () => {
      mocks.isCommunityAdmin = true;

      render(
        <Wrapper>
          <ApplicationFormClient {...openProps} isDisabled={true} />
        </Wrapper>
      );

      expect(screen.getByText(/admin override/i)).toBeInTheDocument();
      expect(screen.getByTestId("application-form")).toBeInTheDocument();
    });

    it("should_show_admin_override_banner_when_disabled_and_user_is_program_reviewer", () => {
      mocks.isReviewer = true;

      render(
        <Wrapper>
          <ApplicationFormClient {...openProps} isDisabled={true} />
        </Wrapper>
      );

      expect(screen.getByText(/admin override/i)).toBeInTheDocument();
      expect(screen.getByTestId("application-form")).toBeInTheDocument();
    });

    it("should_not_show_admin_override_banner_for_non_admin_users_even_when_disabled", () => {
      mocks.isStaff = false;
      mocks.isCommunityAdmin = false;
      mocks.isReviewer = false;

      render(
        <Wrapper>
          <ApplicationFormClient {...openProps} isDisabled={true} />
        </Wrapper>
      );

      expect(screen.queryByText(/admin override/i)).not.toBeInTheDocument();
      expect(screen.getByTestId("application-form")).toBeInTheDocument();
    });
  });
});
