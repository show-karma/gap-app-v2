/**
 * @file Emit-site coverage for `milestone_created` in the unified milestone
 * modal.
 *
 * The contract worth pinning here is the negative one. `milestone_created` is
 * emitted after the attestation resolves, so a submission that never reaches
 * the chain — the #1821 case where the wallet cannot be prepared — must emit
 * nothing at all. An event fired on a failed submit inflates milestone-creation
 * counts with milestones that do not exist, and no assertion on the success
 * path can catch that.
 *
 * Harness mirrors `UnifiedMilestoneScreen.test.tsx`, which drives the same two
 * paths (roadmap and grant) through the same guard.
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
  mockTrack,
} = vi.hoisted(() => ({
  mockSetupChainAndWallet: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
  mockDismiss: vi.fn(),
  mockStartAttestation: vi.fn(),
  mockChangeStepperStep: vi.fn(),
  mockTrack: vi.fn(),
}));

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
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

const createdEvents = () => mockTrack.mock.calls.filter(([name]) => name === "milestone_created");

async function fillAndSubmit({ selectGrant }: { selectGrant: boolean }) {
  renderScreen();

  if (selectGrant) {
    fireEvent.click(await screen.findByRole("button", { name: /select-G/i }));
  }

  fireEvent.change(screen.getByPlaceholderText("Milestone title"), {
    target: { value: "A valid milestone title" },
  });
  fireEvent.change(screen.getByLabelText("description"), {
    target: { value: "A valid description" },
  });

  if (selectGrant) {
    // Grant milestones require an end date before the form will attest.
    fireEvent.click(await screen.findByRole("button", { name: /Select end date/i }));
  }

  const submit = await screen.findByRole("button", { name: /Create Milestone/i });
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
}

describe("UnifiedMilestoneScreen analytics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("roadmap path: emits no milestone_created when the wallet cannot be prepared", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    await fillAndSubmit({ selectGrant: false });

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    // Nothing was attested, so nothing may be reported as created.
    expect(createdEvents()).toHaveLength(0);
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });

  it("grant path: emits no milestone_created when every chain fails to prepare", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    await fillAndSubmit({ selectGrant: true });

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    expect(createdEvents()).toHaveLength(0);
    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining("No milestone was created"));
  });

  it("emits no analytics event of any kind on a failed submission", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    await fillAndSubmit({ selectGrant: false });

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    // Guards the whole surface, not just the one name: a future `_failed` or
    // `_started` leg added here should be a deliberate catalog decision (R2),
    // not something that appears silently.
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
