import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SimocracyConfigCard } from "../SimocracyConfigCard";

const mockUseProgramConfig = vi.fn();
vi.mock("@/hooks/useFundingPlatform", () => ({
  useProgramConfig: (programId: string) => mockUseProgramConfig(programId),
}));

const mockUpdateProgramConfiguration = vi.fn();
vi.mock("@/services/fundingPlatformService", () => ({
  fundingPlatformService: {
    programs: {
      updateProgramConfiguration: (...args: unknown[]) => mockUpdateProgramConfiguration(...args),
    },
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function createConfigResult(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      programId: "simo-test-1",
      chainID: null,
      name: "Simocracy Smoke Program",
      metadata: {},
      applicationConfig: {
        isEnabled: true,
        integrations: {
          simocracy: {
            gatheringUri: "at://did:plc:abc/org.simocracy.gathering/xyz",
            enabled: true,
          },
        },
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

let queryClient: QueryClient;

function renderCard(props: Partial<{ canEdit: boolean }> = {}) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<SimocracyConfigCard programId="simo-test-1" canEdit={props.canEdit ?? true} />, {
    wrapper,
  });
}

describe("SimocracyConfigCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe("loading state", () => {
    it("renders a skeleton while the config loads", () => {
      mockUseProgramConfig.mockReturnValue(
        createConfigResult({ data: undefined, isLoading: true })
      );

      renderCard();

      expect(screen.getByTestId("simocracy-config-loading")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders an error with retry", () => {
      const refetch = vi.fn();
      mockUseProgramConfig.mockReturnValue(
        createConfigResult({ data: undefined, error: new Error("boom"), refetch })
      );

      renderCard();

      expect(screen.getByText(/failed to load the program configuration/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe("success state", () => {
    it("seeds the form from the saved config", async () => {
      mockUseProgramConfig.mockReturnValue(createConfigResult());

      renderCard();

      await waitFor(() => {
        expect(screen.getByLabelText("Gathering AT-URI")).toHaveValue(
          "at://did:plc:abc/org.simocracy.gathering/xyz"
        );
      });
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    });

    it("shows an inline validation error and does not save an invalid AT-URI", async () => {
      mockUseProgramConfig.mockReturnValue(createConfigResult());

      renderCard();

      fireEvent.change(screen.getByLabelText("Gathering AT-URI"), {
        target: { value: "https://not-an-at-uri" },
      });
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/at:\/\//i);
      expect(mockUpdateProgramConfiguration).not.toHaveBeenCalled();
    });

    it("saves only the integrations block through the config update endpoint", async () => {
      mockUseProgramConfig.mockReturnValue(createConfigResult());
      mockUpdateProgramConfiguration.mockResolvedValue({});

      renderCard();

      fireEvent.change(screen.getByLabelText("Gathering AT-URI"), {
        target: { value: "at://did:plc:new/org.simocracy.gathering/next" },
      });
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdateProgramConfiguration).toHaveBeenCalledWith("simo-test-1", {
          integrations: {
            simocracy: {
              gatheringUri: "at://did:plc:new/org.simocracy.gathering/next",
              enabled: true,
            },
          },
        });
      });
    });

    it("includes the flipped toggle state in the saved payload", async () => {
      mockUseProgramConfig.mockReturnValue(createConfigResult());
      mockUpdateProgramConfiguration.mockResolvedValue({});

      renderCard();

      fireEvent.click(screen.getByRole("switch"));
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdateProgramConfiguration).toHaveBeenCalledWith("simo-test-1", {
          integrations: {
            simocracy: {
              gatheringUri: "at://did:plc:abc/org.simocracy.gathering/xyz",
              enabled: false,
            },
          },
        });
      });
    });

    it("disables the save button when nothing changed", () => {
      mockUseProgramConfig.mockReturnValue(createConfigResult());

      renderCard();

      expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    });
  });

  describe("read-only (reviewer)", () => {
    it("disables the form and hides the save button", () => {
      mockUseProgramConfig.mockReturnValue(createConfigResult());

      renderCard({ canEdit: false });

      expect(screen.getByLabelText("Gathering AT-URI")).toBeDisabled();
      expect(screen.getByRole("switch")).toBeDisabled();
      expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    });
  });
});
