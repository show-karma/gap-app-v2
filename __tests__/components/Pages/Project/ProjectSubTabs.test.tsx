import type { User } from "@privy-io/react-auth";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProjectSubTabs } from "@/components/Pages/Project/ProjectSubTabs";
import { useAuth } from "@/hooks/useAuth";
import { useProjectStore } from "@/store";
import { useEndorsementStore } from "@/store/modals/endorsement";
import "@testing-library/jest-dom";

// EndorsementList renders its own data layer (network/SDK) that is irrelevant to
// the userHasEndorsed / Endorse-button behavior under test — stub it out.
vi.mock("@/components/Pages/ProgramRegistry/EndorsementList", () => ({
  EndorsementList: () => <div data-testid="endorsement-list" />,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/store", () => ({ useProjectStore: vi.fn() }));
vi.mock("@/store/modals/endorsement", () => ({ useEndorsementStore: vi.fn() }));

// NOTE: compareAllWallets is intentionally NOT mocked. The whole point of the
// multi-wallet logic is the real address-matching against Privy linkedAccounts,
// so we exercise the real implementation with crafted users.

type MockAuth = ReturnType<typeof useAuth>;
const mockUseAuth = vi.mocked(useAuth);
const mockUseProjectStore = vi.mocked(useProjectStore);
const mockUseEndorsementStore = vi.mocked(useEndorsementStore);

const mockSetIsOpen = vi.fn();
const mockLogin = vi.fn();

const WALLET_A = "0xAAAaAaAAaAAaAaAAaAaaAAaAAaAAAaAaAaAaAAaA";
const WALLET_B = "0xBbBBBBBbbBBBbbBBbbbbbBBBBbbbbbBBBBbBbbBb";
const WALLET_UNRELATED = "0xCccccCccCCcCcCCCcCcccCcCCCCcCcccccccCCcc";

/**
 * Build a minimal-but-valid Privy User whose linkedAccounts contain the given
 * external wallet addresses. Cast through unknown because we only populate the
 * fields getLinkedWalletAddresses reads.
 */
function makeUser(walletAddresses: string[]): User {
  return {
    id: "did:privy:user-1",
    createdAt: new Date(),
    linkedAccounts: walletAddresses.map((address) => ({
      type: "wallet",
      address,
      chainType: "ethereum",
    })),
  } as unknown as User;
}

interface AuthOverrides {
  isConnected?: boolean;
  authenticated?: boolean;
  user?: User | null;
  login?: () => void;
}

function setupAuth(overrides: AuthOverrides = {}) {
  const { isConnected = false, authenticated = false, user = null, login = mockLogin } = overrides;
  mockUseAuth.mockReturnValue({
    isConnected,
    authenticated,
    user,
    login,
  } as unknown as MockAuth);
}

function setupProject(project: unknown) {
  mockUseProjectStore.mockImplementation((selector: (state: unknown) => unknown) =>
    selector({ project })
  );
}

function makeEndorsements(recipients: Array<string | undefined | null>) {
  return recipients.map((recipient, index) => ({
    uid: `endorsement-${index}`,
    recipient,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseEndorsementStore.mockReturnValue({
    isEndorsementOpen: false,
    setIsEndorsementOpen: mockSetIsOpen,
  });
  // Default: a project with no endorsements.
  setupProject({ endorsements: [] });
  setupAuth();
});

const getEndorseButton = () => screen.getByRole("button", { name: /endorse this project/i });
const ALREADY_ENDORSED_COPY = /you have already endorsed this project/i;

// The "already endorsed" message lives in a Radix Tooltip.Portal that is only
// rendered when userHasEndorsed is true, and Radix only reveals tooltip content
// once the trigger is focused/hovered. Focus the trigger to open the tooltip.
function openTooltip() {
  act(() => {
    getEndorseButton().focus();
  });
}

async function expectAlreadyEndorsedTooltip() {
  openTooltip();
  // getAllByText: Radix renders the content twice (visible + a11y mirror).
  await waitFor(() => {
    expect(screen.getAllByText(ALREADY_ENDORSED_COPY).length).toBeGreaterThan(0);
  });
}

function expectNoAlreadyEndorsedTooltip() {
  openTooltip();
  expect(screen.queryByText(ALREADY_ENDORSED_COPY)).not.toBeInTheDocument();
}

describe("ProjectSubTabs", () => {
  describe("rendering", () => {
    it("renders the Endorsements header, endorse button, and the endorsement list", () => {
      render(<ProjectSubTabs />);

      expect(screen.getByText("Endorsements")).toBeInTheDocument();
      expect(getEndorseButton()).toBeInTheDocument();
      expect(screen.getByTestId("endorsement-list")).toBeInTheDocument();
    });
  });

  describe("Endorse button action", () => {
    it("opens the endorsement modal when the wallet is connected", () => {
      setupAuth({ isConnected: true, authenticated: true, user: makeUser([WALLET_A]) });

      render(<ProjectSubTabs />);
      fireEvent.click(getEndorseButton());

      expect(mockSetIsOpen).toHaveBeenCalledTimes(1);
      expect(mockSetIsOpen).toHaveBeenCalledWith(true);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("triggers login (not the modal) when the wallet is not connected", () => {
      setupAuth({ isConnected: false });

      render(<ProjectSubTabs />);
      fireEvent.click(getEndorseButton());

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockSetIsOpen).not.toHaveBeenCalled();
    });

    it("does not throw when disconnected and login is undefined (optional-chaining guard)", () => {
      setupAuth({ isConnected: false, login: undefined as unknown as () => void });

      render(<ProjectSubTabs />);

      expect(() => fireEvent.click(getEndorseButton())).not.toThrow();
      expect(mockSetIsOpen).not.toHaveBeenCalled();
    });
  });

  describe("userHasEndorsed — already-endorsed tooltip", () => {
    it("shows the already-endorsed tooltip when an endorsement matches the active wallet", async () => {
      setupAuth({ isConnected: true, authenticated: true, user: makeUser([WALLET_A]) });
      setupProject({ endorsements: makeEndorsements([WALLET_A]) });

      render(<ProjectSubTabs />);

      await expectAlreadyEndorsedTooltip();
    });

    it("matches an endorsement made with ANOTHER linked wallet (multi-wallet)", async () => {
      // User is acting with WALLET_A now, but endorsed earlier with WALLET_B,
      // which is also linked to the same Privy account.
      setupAuth({ isConnected: true, authenticated: true, user: makeUser([WALLET_A, WALLET_B]) });
      setupProject({ endorsements: makeEndorsements([WALLET_B]) });

      render(<ProjectSubTabs />);

      await expectAlreadyEndorsedTooltip();
    });

    it("matches case-insensitively (checksummed endorsement vs lowercase wallet)", async () => {
      setupAuth({
        isConnected: true,
        authenticated: true,
        user: makeUser([WALLET_A.toLowerCase()]),
      });
      setupProject({ endorsements: makeEndorsements([WALLET_A.toUpperCase()]) });

      render(<ProjectSubTabs />);

      await expectAlreadyEndorsedTooltip();
    });

    it("does NOT show the tooltip when no endorsement recipient matches any linked wallet", () => {
      setupAuth({ isConnected: true, authenticated: true, user: makeUser([WALLET_A, WALLET_B]) });
      setupProject({ endorsements: makeEndorsements([WALLET_UNRELATED]) });

      render(<ProjectSubTabs />);

      expectNoAlreadyEndorsedTooltip();
    });

    it("ignores endorsements with a missing recipient and still matches a valid one", async () => {
      setupAuth({ isConnected: true, authenticated: true, user: makeUser([WALLET_A]) });
      setupProject({ endorsements: makeEndorsements([undefined, null, WALLET_A]) });

      render(<ProjectSubTabs />);

      await expectAlreadyEndorsedTooltip();
    });

    it("does not show the tooltip when every endorsement recipient is missing", () => {
      setupAuth({ isConnected: true, authenticated: true, user: makeUser([WALLET_A]) });
      setupProject({ endorsements: makeEndorsements([undefined, null]) });

      render(<ProjectSubTabs />);

      expectNoAlreadyEndorsedTooltip();
    });
  });

  describe("userHasEndorsed — auth/connection boundaries", () => {
    it("does not show the tooltip when unauthenticated, even if a wallet matches", () => {
      setupAuth({ isConnected: true, authenticated: false, user: makeUser([WALLET_A]) });
      setupProject({ endorsements: makeEndorsements([WALLET_A]) });

      render(<ProjectSubTabs />);

      expectNoAlreadyEndorsedTooltip();
    });

    it("does not show the tooltip when disconnected, even if authenticated and matching", () => {
      setupAuth({ isConnected: false, authenticated: true, user: makeUser([WALLET_A]) });
      setupProject({ endorsements: makeEndorsements([WALLET_A]) });

      render(<ProjectSubTabs />);

      expectNoAlreadyEndorsedTooltip();
    });

    it("does not show the tooltip when there is no user object", () => {
      setupAuth({ isConnected: true, authenticated: true, user: null });
      setupProject({ endorsements: makeEndorsements([WALLET_A]) });

      render(<ProjectSubTabs />);

      expectNoAlreadyEndorsedTooltip();
    });

    it("does not show the tooltip when the project has no endorsements", () => {
      setupAuth({ isConnected: true, authenticated: true, user: makeUser([WALLET_A]) });
      setupProject({ endorsements: [] });

      render(<ProjectSubTabs />);

      expectNoAlreadyEndorsedTooltip();
    });

    it("does not show the tooltip and still renders when project is undefined", () => {
      setupAuth({ isConnected: true, authenticated: true, user: makeUser([WALLET_A]) });
      setupProject(undefined);

      render(<ProjectSubTabs />);

      expect(getEndorseButton()).toBeInTheDocument();
      expectNoAlreadyEndorsedTooltip();
    });
  });
});
