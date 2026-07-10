/**
 * @file Regression test for the #1821 false-success guard in the milestone
 * modal. When the wallet can't be prepared (setupChainAndWallet → null), the
 * flow must surface an error and MUST NOT show a success toast. Exercises the
 * roadmap path (no grant selected), which shares the same guard as the grant
 * path but is simpler to drive (no MultiSelect/end-date).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSetupChainAndWallet,
  mockShowSuccess,
  mockShowError,
  mockDismiss,
  mockStartAttestation,
  mockChangeStepperStep,
} = vi.hoisted(() => ({
  mockSetupChainAndWallet: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
  mockDismiss: vi.fn(),
  mockStartAttestation: vi.fn(),
  mockChangeStepperStep: vi.fn(),
}));

vi.mock("@/store", () => ({
  useProjectStore: (selector: (s: unknown) => unknown) =>
    selector({ project: { uid: "0xproject", chainID: 10, details: { slug: "proj" } } }),
}));
vi.mock("@/store/modals/progress", () => ({
  useProgressModalStore: () => ({
    closeProgressModal: vi.fn(),
    preSelectedGrantId: null,
    setPreSelectedGrantId: vi.fn(),
  }),
}));
vi.mock("@/hooks/v2/useProjectGrants", () => ({
  // One grant so the main form renders (0 grants renders a different sub-form),
  // but we leave it unselected → the roadmap path runs.
  useProjectGrants: () => ({
    grants: [{ uid: "0xgrant", chainID: 10, details: { title: "G" } }],
    refetch: vi.fn().mockResolvedValue({ data: [] }),
  }),
}));
vi.mock("@/hooks/v2/useProjectUpdates", () => ({
  useProjectUpdates: () => ({ refetch: vi.fn().mockResolvedValue({ data: {} }) }),
}));
vi.mock("wagmi", () => ({ useAccount: () => ({ address: "0xwagmi", chain: { id: 10 } }) }));
vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    smartWalletAddress: "0xembedded",
    signerStatus: "ready",
    isSmartWalletReady: true,
    hasEmbeddedWallet: true,
    hasExternalWallet: false,
  }),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ connectWallet: vi.fn() }) }));
vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: mockStartAttestation,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    dismiss: mockDismiss,
    changeStepperStep: mockChangeStepperStep,
  }),
}));
vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
    createElement("textarea", {
      "aria-label": "description",
      value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    }),
}));
vi.mock("@/components/Utilities/DatePicker", () => ({
  // Clicking the picker sets a concrete date via onSelect (needed for the
  // grant path, which requires an end date before it will attest).
  DatePicker: ({ onSelect, placeholder }: { onSelect: (d: Date) => void; placeholder: string }) =>
    createElement(
      "button",
      {
        type: "button",
        "aria-label": placeholder,
        onClick: () => onSelect(new Date("2030-01-01")),
      },
      placeholder
    ),
}));
vi.mock("@/components/Utilities/MultiSelect", () => ({
  // Renders a select button per option so a test can pick a grant.
  MultiSelect: ({
    options,
    onChange,
  }: {
    options: { value: string; label: string }[];
    onChange: (ids: string[]) => void;
  }) =>
    createElement(
      "div",
      null,
      options.map((o) =>
        createElement(
          "button",
          { key: o.value, type: "button", onClick: () => onChange([o.value]) },
          `select-${o.label}`
        )
      )
    ),
}));
vi.mock("@/components/Forms/ProjectObjective", () => ({ ProjectObjectiveForm: () => null }));

import { UnifiedMilestoneScreen } from "@/components/Dialogs/ProgressDialog/UnifiedMilestoneScreen";

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(UnifiedMilestoneScreen)
    ) as ReactNode
  );
}

describe("UnifiedMilestoneScreen — false-success guard (#1821)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows an error and NO success toast when the wallet can't be prepared", async () => {
    // Signer is 'ready' so submit proceeds, but chain/wallet setup fails.
    mockSetupChainAndWallet.mockResolvedValue(null);

    renderScreen();

    fireEvent.change(screen.getByPlaceholderText("Milestone title"), {
      target: { value: "A valid milestone title" },
    });
    fireEvent.change(screen.getByLabelText("description"), {
      target: { value: "A valid description" },
    });

    const submit = await screen.findByRole("button", { name: /Create Milestone/i });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    // The core #1821 sibling-bug contract: no success toast for zero attestations.
    expect(mockShowError).toHaveBeenCalled();
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });

  it("grant path: shows NO 'Milestones created!' when every chain fails to prepare (anyAttested guard)", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    renderScreen();

    // Select the grant → switches to the grant-milestone path.
    fireEvent.click(await screen.findByRole("button", { name: /select-G/i }));

    fireEvent.change(screen.getByPlaceholderText("Milestone title"), {
      target: { value: "A valid milestone title" },
    });
    fireEvent.change(screen.getByLabelText("description"), {
      target: { value: "A valid description" },
    });
    // End date is required for grant milestones.
    fireEvent.click(await screen.findByRole("button", { name: /Select end date/i }));

    const submit = await screen.findByRole("button", { name: /Create Milestone/i });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining("No milestone was created"));
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });
});
