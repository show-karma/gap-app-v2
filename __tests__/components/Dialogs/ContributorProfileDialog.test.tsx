import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContributorProfileDialog } from "@/components/Dialogs/ContributorProfileDialog";

// ---------------------------------------------------------------------------
// Regression coverage for Sentry GAP-FRONTEND-225.
//
// Production crashed with an unhandled ZodError because the form `zodResolver`
// re-threw validation errors as unhandled promise rejections when the required
// `name` field was undefined/empty. The real react-hook-form resolver MUST run
// here (do NOT mock react-hook-form or @hookform/resolvers) so that:
//   1. The "This name is too short" error renders in the DOM, and
//   2. The profile create/update side effect (SDK `attest`) is NEVER reached.
// The global setup additionally fails any test that leaks an unhandled
// rejection, which is the exact symptom of the original bug.
// ---------------------------------------------------------------------------

// SDK ContributorProfile — the create/update side effect we must assert is NOT
// invoked on validation failure (and IS invoked on the happy path).
const mockAttest = vi.fn();
const mockContributorProfileCtor = vi.fn();
vi.mock("@show-karma/karma-gap-sdk", () => ({
  ContributorProfile: class {
    uid = "0xprofile";
    constructor(args: unknown) {
      mockContributorProfileCtor(args);
    }
    attest(...attestArgs: unknown[]) {
      return mockAttest(...attestArgs);
    }
  },
}));

// Headless UI Dialog/Transition — render children directly when `show` is true.
vi.mock("@headlessui/react", () => {
  const React = require("react");

  const TRANSITION_PROPS = [
    "appear",
    "show",
    "enter",
    "enterFrom",
    "enterTo",
    "leave",
    "leaveFrom",
    "leaveTo",
    "entered",
    "beforeEnter",
    "afterEnter",
    "beforeLeave",
    "afterLeave",
  ];

  const filterProps = (props: Record<string, unknown>) =>
    Object.keys(props).reduce<Record<string, unknown>>((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) acc[key] = props[key];
      return acc;
    }, {});

  const MockDialog = ({ children, onClose, ...props }: Record<string, unknown>) => (
    <div data-testid="dialog" {...filterProps(props)}>
      {children as React.ReactNode}
    </div>
  );
  MockDialog.Panel = ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="dialog-panel" {...filterProps(props)}>
      {children as React.ReactNode}
    </div>
  );
  MockDialog.Title = ({ children, as, ...props }: Record<string, unknown>) => {
    const Component = (as as string) || "h3";
    return <Component {...filterProps(props)}>{children as React.ReactNode}</Component>;
  };

  const MockTransitionRoot = ({ show, children, as, ...props }: Record<string, unknown>) => {
    if (!show) return null;
    const Component = (as as string) || "div";
    return <Component {...filterProps(props)}>{children as React.ReactNode}</Component>;
  };
  MockTransitionRoot.displayName = "Transition";

  const MockTransitionChild = ({ children, as, ...props }: Record<string, unknown>) => {
    const Component = (as as string) || "div";
    return <Component {...filterProps(props)}>{children as React.ReactNode}</Component>;
  };
  MockTransitionChild.displayName = "Transition.Child";
  MockTransitionRoot.Child = MockTransitionChild;

  return {
    Dialog: MockDialog,
    Transition: MockTransitionRoot,
    Fragment: React.Fragment,
  };
});

vi.mock("lucide-react", () => ({
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}));

// Wagmi — supported chain so onSubmit can resolve a target chain id.
vi.mock("wagmi", () => ({
  useAccount: () => ({ chain: { id: 10 } }),
}));

// Auth — authenticated + connected so the form (not the login CTA) renders.
const mockLogin = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    address: "0x1111111111111111111111111111111111111111",
    isConnected: true,
    authenticated: true,
    login: mockLogin,
  }),
}));

const mockRefetchProfile = vi.fn().mockResolvedValue({ data: undefined });
vi.mock("@/hooks/useContributorProfile", () => ({
  useContributorProfile: () => ({ profile: undefined, refetch: mockRefetchProfile }),
}));

const mockRefetchTeamProfiles = vi.fn();
vi.mock("@/hooks/useTeamProfiles", () => ({
  useTeamProfiles: () => ({ refetch: mockRefetchTeamProfiles }),
}));

vi.mock("@/hooks/useGap", () => ({
  useGap: () => ({
    gap: {
      network: "optimism",
      findSchema: vi.fn(() => ({ uid: "0xschema" })),
    },
  }),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ switchChainAsync: vi.fn() }),
}));

// Setup chain/wallet — resolves a usable signer so the happy path proceeds
// far enough to construct + attest the ContributorProfile.
const mockSetupChainAndWallet = vi.fn().mockResolvedValue({
  gapClient: { findSchema: vi.fn(() => ({ uid: "0xschema" })) },
  walletSigner: {},
});
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: (...args: unknown[]) => mockSetupChainAndWallet(...args),
    isSmartWalletReady: false,
    smartWalletAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
  }),
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: vi.fn(),
    showLoading: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    dismiss: vi.fn(),
    changeStepperStep: vi.fn(),
  }),
}));

// Project store — global mode so onSubmit doesn't require a project object.
const mockRefreshProject = vi.fn().mockResolvedValue(undefined);
vi.mock("@/store", () => ({
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ project: undefined, refreshProject: mockRefreshProject }),
}));

// Modal store — open in global (editing) mode so the form renders.
vi.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    isModalOpen: true,
    isGlobal: true,
    closeModal: vi.fn(),
  }),
}));

const mockFetchData = vi.fn().mockResolvedValue([{}, null, null, 200]);
vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockFetchData(...args),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    ATTESTATION_LISTENER: (uid: string, chainId: number) => `/listener/${uid}/${chainId}`,
    PROJECT: {
      INVITATION: { ACCEPT_LINK: (uid: string) => `/projects/${uid}/invite/accept` },
    },
  },
}));

vi.mock("@/utilities/network", () => ({
  gapSupportedNetworks: [{ id: 10, name: "optimism" }],
  getChainIdByName: () => 10,
}));

vi.mock("@/utilities/tailwind", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/constants/brand", () => ({ PROJECT_NAME: "Karma GAP" }));

describe("ContributorProfileDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetupChainAndWallet.mockResolvedValue({
      gapClient: { findSchema: vi.fn(() => ({ uid: "0xschema" })) },
      walletSigner: {},
    });
    mockAttest.mockResolvedValue({ tx: [{ hash: "0xtxhash" }] });
    // No indexed profile back -> retry loop exits via the "submitted" branch.
    mockRefetchProfile.mockResolvedValue({ data: undefined });
  });

  const getNameInput = () => screen.getByPlaceholderText("Ex: John Doe") as HTMLInputElement;

  it("renders the profile form with the required name field", () => {
    render(<ContributorProfileDialog />);
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(getNameInput()).toBeInTheDocument();
  });

  describe("validation failure (Sentry GAP-FRONTEND-225)", () => {
    it("renders the name validation error when name is empty on submit", async () => {
      const { container } = render(<ContributorProfileDialog />);

      // The submit button is disabled while the form is invalid, so submit the
      // form element directly — this drives the real handleSubmit/zodResolver
      // path that originally re-threw the ZodError.
      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form as HTMLFormElement);

      await waitFor(() => {
        expect(screen.getByText("This name is too short")).toBeInTheDocument();
      });
    });

    it("renders the name validation error when name is shorter than 3 chars", async () => {
      const user = userEvent.setup();
      const { container } = render(<ContributorProfileDialog />);

      await user.type(getNameInput(), "Jo");

      const form = container.querySelector("form");
      fireEvent.submit(form as HTMLFormElement);

      await waitFor(() => {
        expect(screen.getByText("This name is too short")).toBeInTheDocument();
      });
    });

    it("does NOT invoke the profile create/update side effect when validation fails", async () => {
      const { container } = render(<ContributorProfileDialog />);

      const form = container.querySelector("form");
      fireEvent.submit(form as HTMLFormElement);

      await waitFor(() => {
        expect(screen.getByText("This name is too short")).toBeInTheDocument();
      });

      // The real symptom of the regression: the submit handler never runs, so
      // neither the SDK profile is constructed nor is `attest` called.
      expect(mockContributorProfileCtor).not.toHaveBeenCalled();
      expect(mockAttest).not.toHaveBeenCalled();
      expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("invokes the profile create/update side effect with valid input", async () => {
      const user = userEvent.setup();
      const { container } = render(<ContributorProfileDialog />);

      await user.type(getNameInput(), "John Doe");

      const form = container.querySelector("form");
      fireEvent.submit(form as HTMLFormElement);

      await waitFor(() => {
        expect(mockAttest).toHaveBeenCalledTimes(1);
      });

      expect(mockContributorProfileCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "John Doe" }),
        })
      );
      // No validation error should be present on the happy path.
      expect(screen.queryByText("This name is too short")).not.toBeInTheDocument();
    });
  });
});
