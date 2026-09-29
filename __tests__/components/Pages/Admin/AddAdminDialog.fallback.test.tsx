import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const UUID = `0x${"a".repeat(64)}` as `0x${string}`;
const NEW_ADMIN = "0x48138e594554e38078de1b2f2c817e81fe258aec";

const { enlist, resolveEmailToWallet, enlistAdmin, apiPost, apiGet, toast } = vi.hoisted(() => ({
  enlist: vi.fn(),
  resolveEmailToWallet: vi.fn(),
  enlistAdmin: vi.fn(),
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  toast: {
    changeStepperStep: vi.fn(),
    setIsStepper: vi.fn(),
    startAttestation: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
  },
}));

vi.mock("@show-karma/karma-gap-sdk", () => ({
  GAP: { getCommunityResolver: vi.fn(async () => ({ enlist })) },
}));
vi.mock("wagmi", () => ({ useAccount: () => ({ chain: { id: 11155420 } }) }));
vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: vi.fn(async () => ({ walletSigner: {} })),
  }),
}));
vi.mock("@/hooks/useAttestationToast", () => ({ useAttestationToast: () => toast }));
vi.mock("@/services/community-admins.service", () => ({
  communityAdminsService: { resolveEmailToWallet, enlistAdmin },
}));
vi.mock("@/utilities/api/client", () => ({ api: { post: apiPost, get: apiGet } }));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));

import { AddAdmin } from "@/components/Pages/Admin/AddAdminDialog";

async function submitEmail() {
  const fetchAdmins = vi.fn();
  render(<AddAdmin UUID={UUID} chainid={11155420} fetchAdmins={fetchAdmins} />);
  fireEvent.click(screen.getByRole("button", { name: /Add Admin/ }));
  fireEvent.change(await screen.findByLabelText(/Email/), {
    target: { value: "new-admin@example.com" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: /Add Admin/ }).at(-1) as HTMLElement);
  return fetchAdmins;
}

describe("AddAdminDialog backend fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveEmailToWallet.mockResolvedValue(NEW_ADMIN);
    apiGet.mockResolvedValue({ admins: [{ user: { id: NEW_ADMIN } }] });
  });

  it("enlists through the backend and notifies the listener when the wallet tx reverts", async () => {
    enlist.mockRejectedValue(new Error("execution reverted: AccessDenied()"));
    enlistAdmin.mockResolvedValue({ txHash: "0xtx", alreadyAdmin: false });

    const fetchAdmins = await submitEmail();

    await waitFor(() =>
      expect(toast.showSuccess).toHaveBeenCalledWith("Admin added successfully!")
    );
    expect(enlistAdmin).toHaveBeenCalledWith(UUID, NEW_ADMIN);
    expect(apiPost).toHaveBeenCalledWith(expect.stringContaining("0xtx"), {});
    expect(fetchAdmins).toHaveBeenCalled();
    expect(toast.showError).not.toHaveBeenCalled();
  });

  it("skips the listener when the backend reports the address is already an admin", async () => {
    enlist.mockRejectedValue(new Error("execution reverted"));
    enlistAdmin.mockResolvedValue({ txHash: null, alreadyAdmin: true });

    await submitEmail();

    await waitFor(() => expect(toast.showSuccess).toHaveBeenCalled());
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("does not call the backend when the user rejects the wallet request", async () => {
    enlist.mockRejectedValue(
      Object.assign(new Error("User rejected the request."), { code: 4001 })
    );

    await submitEmail();

    await waitFor(() => expect(toast.showError).toHaveBeenCalled());
    expect(enlistAdmin).not.toHaveBeenCalled();
  });

  it("keeps the on-chain path when the wallet can enlist", async () => {
    enlist.mockResolvedValue({ hash: "0xwallettx", wait: vi.fn().mockResolvedValue({}) });

    await submitEmail();

    await waitFor(() => expect(toast.showSuccess).toHaveBeenCalled());
    expect(enlistAdmin).not.toHaveBeenCalled();
    expect(apiPost).toHaveBeenCalledWith(expect.stringContaining("0xwallettx"), {});
  });

  it("shows an error when both the wallet and the backend fail", async () => {
    enlist.mockRejectedValue(new Error("execution reverted"));
    enlistAdmin.mockRejectedValue(new Error("503"));

    await submitEmail();

    await waitFor(() =>
      expect(toast.showError).toHaveBeenCalledWith("Failed to add admin. Please try again.")
    );
    expect(toast.showSuccess).not.toHaveBeenCalled();
  });
});
