import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import fetchData from "@/utilities/fetchData";
import { ApplicationFormClient } from "../ApplicationFormClient";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/src/core/rbac/hooks/use-staff-bridge", () => ({
  useStaff: () => ({ isStaff: false, isLoading: false }),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({ isWhitelabel: false, communitySlug: null }),
}));

vi.mock("@/src/features/applications/hooks/use-application-submit", () => ({
  useApplicationSubmit: () => ({ submit: vi.fn() }),
}));

vi.mock("@/src/features/applications/components/ApplicationForm", () => ({
  ApplicationForm: () => <div data-testid="application-form">Form Body</div>,
}));

vi.mock("@/src/features/applications/components/AccessCodeModal", () => ({
  AccessCodeModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="access-code-modal" /> : null,
}));

const mockFetchData = fetchData as unknown as ReturnType<typeof vi.fn>;

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const baseProps = {
  communityId: "test-community",
  programId: "test-program",
  questions: [],
  formSchema: {
    questions: [],
    settings: { accessCodeEnabled: true },
  } as never,
  programName: "Test Program",
};

describe("ApplicationFormClient access code gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try {
      window.sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  it("should_keep_form_locked_when_validation_response_is_valid_false", async () => {
    // Regression: the endpoint returns { valid: boolean }. The previous
    // implementation typed the response as boolean and used Boolean(result),
    // so Boolean({ valid: false }) === true unlocked the form on wrong codes.
    mockFetchData.mockResolvedValue([{ valid: false }, null, null, 200]);

    render(
      <Wrapper>
        <ApplicationFormClient {...baseProps} />
      </Wrapper>
    );

    const input = await screen.findByPlaceholderText("Enter your access code");
    fireEvent.change(input, { target: { value: "wrong-code" } });

    const submitButton = screen.getByRole("button", { name: /unlock application/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/funding-applications/test-program/validate-access-code",
        "POST",
        { accessCode: "wrong-code" }
      );
    });

    expect(screen.queryByTestId("application-form")).not.toBeInTheDocument();
    expect(await screen.findByText(/invalid access code/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your access code")).toBeInTheDocument();
  });

  it("should_unlock_form_when_validation_response_is_valid_true", async () => {
    mockFetchData.mockResolvedValue([{ valid: true }, null, null, 200]);

    render(
      <Wrapper>
        <ApplicationFormClient {...baseProps} />
      </Wrapper>
    );

    const input = await screen.findByPlaceholderText("Enter your access code");
    fireEvent.change(input, { target: { value: "correct-code" } });

    const submitButton = screen.getByRole("button", { name: /unlock application/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("application-form")).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Enter your access code")).not.toBeInTheDocument();
  });

  it("should_keep_form_locked_when_fetchData_returns_error", async () => {
    mockFetchData.mockResolvedValue([null, "network error", null, 500]);

    render(
      <Wrapper>
        <ApplicationFormClient {...baseProps} />
      </Wrapper>
    );

    const input = await screen.findByPlaceholderText("Enter your access code");
    fireEvent.change(input, { target: { value: "any-code" } });

    const submitButton = screen.getByRole("button", { name: /unlock application/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.queryByTestId("application-form")).not.toBeInTheDocument();
    expect(await screen.findByText(/invalid access code/i)).toBeInTheDocument();
  });
});
