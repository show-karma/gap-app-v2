import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReEvaluateInternalButton } from "@/components/FundingPlatform/ApplicationView/ReEvaluateInternalButton";
import { fundingApplicationsAPI } from "@/services/fundingPlatformService";

vi.mock("@/services/fundingPlatformService", () => ({
  fundingApplicationsAPI: {
    runInternalAIEvaluation: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockApi = fundingApplicationsAPI as unknown as {
  runInternalAIEvaluation: ReturnType<typeof vi.fn>;
};

function renderButton(props: {
  referenceNumber?: string;
  onEvaluationComplete?: () => void;
  disabled?: boolean;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReEvaluateInternalButton
        referenceNumber={props.referenceNumber ?? "APP-001"}
        onEvaluationComplete={props.onEvaluationComplete}
        disabled={props.disabled}
      />
    </QueryClientProvider>
  );
}

describe("ReEvaluateInternalButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the re-evaluate button", () => {
    renderButton();
    expect(screen.getByRole("button", { name: /re-evaluate/i })).toBeInTheDocument();
  });

  it("does not call the API on initial render", () => {
    renderButton();
    expect(mockApi.runInternalAIEvaluation).not.toHaveBeenCalled();
  });

  it("opens a confirmation dialog when clicked, NOT calling the API yet", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /re-evaluate/i }));

    expect(
      screen.getByRole("heading", { name: /re-run internal ai evaluation\?/i })
    ).toBeInTheDocument();
    expect(mockApi.runInternalAIEvaluation).not.toHaveBeenCalled();
  });

  it("closes the dialog and aborts when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /re-evaluate/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(
      screen.queryByRole("heading", { name: /re-run internal ai evaluation\?/i })
    ).not.toBeInTheDocument();
    expect(mockApi.runInternalAIEvaluation).not.toHaveBeenCalled();
  });

  it("calls the API with the reference number when confirmed", async () => {
    mockApi.runInternalAIEvaluation.mockResolvedValue({
      success: true,
      referenceNumber: "APP-001",
      evaluation: "{}",
      promptId: "p-1",
      updatedAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    renderButton({ referenceNumber: "APP-001" });

    await user.click(screen.getByRole("button", { name: /re-evaluate/i }));
    const confirmButton = screen
      .getAllByRole("button", { name: /re-evaluate/i })
      .find((b) => b.getAttribute("data-state") !== "open" && b.textContent === "Re-evaluate");
    expect(confirmButton).toBeDefined();
    await user.click(confirmButton!);

    await waitFor(() => {
      expect(mockApi.runInternalAIEvaluation).toHaveBeenCalledWith("APP-001");
    });
  });

  it("disables both trigger and confirm while the mutation is pending", async () => {
    let resolveFn: ((value: unknown) => void) | undefined;
    mockApi.runInternalAIEvaluation.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /re-evaluate/i }));
    const buttons = screen.getAllByRole("button", { name: /re-evaluate/i });
    const confirmButton = buttons[buttons.length - 1];
    await user.click(confirmButton);

    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
    });

    resolveFn?.({
      success: true,
      referenceNumber: "APP-001",
      evaluation: "{}",
      promptId: "p",
      updatedAt: "",
    });
  });
});
