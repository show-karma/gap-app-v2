/**
 * @file Emit-site coverage for `project_endorsed`.
 *
 * Catalog shape: `{ project_id: string, endorser_is_member: boolean }`.
 *
 * `endorser_is_member` is the reason this event is worth anything: an
 * endorsement from the project's own team is a different signal from an
 * outsider's, and the attestation does not record which it was. It is derived
 * in the component from the connected address against `project.owner` and
 * `project.members`, so the two branches are only provable here.
 *
 * The negative case matters just as much: the event fires after the
 * endorsement is observed on-chain, so a submission that never attests must
 * emit nothing.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";

const {
  mockTrack,
  mockSetupChainAndWallet,
  mockAttest,
  mockGetProject,
  mockShowSuccess,
  mockRefreshProject,
} = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockSetupChainAndWallet: vi.fn(),
  mockAttest: vi.fn(),
  mockGetProject: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockRefreshProject: vi.fn(),
}));

const ENDORSEMENT_UID = "0xendorsement";
const PROJECT_UID = "0xproject";
const ENDORSER = "0xAbCdEf0000000000000000000000000000000001";
const OUTSIDER_OWNER = "0x9999999999999999999999999999999999999999";

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock("@headlessui/react", () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const MockDialog = Object.assign(Passthrough, {
    Panel: Passthrough,
    Title: Passthrough,
  });
  const MockTransition = Object.assign(
    ({ show, children }: { show?: boolean; children: React.ReactNode }) =>
      show === false ? null : <div>{children}</div>,
    { Child: Passthrough }
  );
  return { Dialog: MockDialog, Transition: MockTransition, Fragment: "div" };
});

vi.mock("@show-karma/karma-gap-sdk", () => ({
  ProjectEndorsement: class {
    uid = ENDORSEMENT_UID;
    chainID = 10;
    attest = mockAttest;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/project/proj",
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: ENDORSER, chain: { id: 10 } }),
}));

let projectState: {
  uid: string;
  chainID: number;
  owner: string;
  members: { address: string }[];
  details: { slug: string; title: string };
};

vi.mock("@/store", () => ({
  useProjectStore: (selector: (s: unknown) => unknown) =>
    selector({ project: projectState, refreshProject: mockRefreshProject }),
}));

vi.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({ isEndorsementOpen: true, setIsEndorsementOpen: vi.fn() }),
}));

vi.mock("@/store/modals/shareDialog", () => ({
  useShareDialogStore: () => ({ openShareDialog: vi.fn() }),
}));

vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    smartWalletAddress: undefined,
  }),
}));

vi.mock("@/hooks/useGap", () => ({ useGap: () => ({ gap: {} }) }));

// No contacts → notifyProjectOwner returns early, keeping the test on the
// analytics path rather than the notification fan-out.
vi.mock("@/hooks/useContactInfo", () => ({ useContactInfo: () => ({ data: [] }) }));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: vi.fn(),
    changeStepperStep: vi.fn(),
    showSuccess: mockShowSuccess,
    showError: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/services/project.service", () => ({
  getProject: (...args: unknown[]) => mockGetProject(...args),
}));

vi.mock("@/utilities/api/client", () => ({ api: { post: vi.fn().mockResolvedValue({}) } }));
vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    ATTESTATION_LISTENER: () => "/listener",
    PROJECT: { ENDORSEMENT: { NOTIFY: () => "/notify" } },
  },
}));
vi.mock("@/utilities/pages", () => ({
  PAGES: { PROJECT: { OVERVIEW: (s: string) => `/project/${s}` } },
}));
vi.mock("@/utilities/share/text", () => ({
  SHARE_TEXTS: { PROJECT_ENDORSEMENT: () => "shared" },
}));
vi.mock("@/utilities/sanitize", () => ({ sanitizeObject: (o: unknown) => o }));
vi.mock("@/utilities/shortAddress", () => ({ shortAddress: (a: string) => a }));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));
vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ onChange }: { onChange: (v: string) => void }) =>
    createElement("textarea", {
      "aria-label": "comment",
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    }),
}));
vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

import { EndorsementDialog } from "@/components/Pages/Project/Impact/EndorsementDialog";

const endorsedEvents = () => mockTrack.mock.calls.filter(([name]) => name === "project_endorsed");

const clickEndorse = async () => {
  render(<EndorsementDialog />);
  fireEvent.click(screen.getByRole("button", { name: /^Endorse$/i }));
};

beforeEach(() => {
  vi.clearAllMocks();
  projectState = {
    uid: PROJECT_UID,
    chainID: 10,
    owner: OUTSIDER_OWNER,
    members: [],
    details: { slug: "proj", title: "Proj" },
  };
  mockSetupChainAndWallet.mockResolvedValue({
    walletSigner: {},
    gapClient: { findSchema: () => ({}) },
  });
  mockAttest.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  // The component polls until the endorsement shows up on the project.
  mockGetProject.mockResolvedValue({ endorsements: [{ uid: ENDORSEMENT_UID }] });
});

describe("EndorsementDialog analytics", () => {
  it("emits project_endorsed with endorser_is_member false for an outsider", async () => {
    await clickEndorse();

    await waitFor(() => expect(endorsedEvents()).toHaveLength(1));
    expect(endorsedEvents()[0]).toEqual([
      "project_endorsed",
      { project_id: PROJECT_UID, endorser_is_member: false },
    ]);
  });

  it("marks endorser_is_member true when the endorser owns the project", async () => {
    projectState.owner = ENDORSER;

    await clickEndorse();

    await waitFor(() => expect(endorsedEvents()).toHaveLength(1));
    expect(endorsedEvents()[0][1]).toMatchObject({ endorser_is_member: true });
  });

  it("marks endorser_is_member true when the endorser is a project member", async () => {
    // Stored with different casing than the connected address on purpose: the
    // comparison is case-insensitive and a regression here would silently
    // reclassify every team endorsement as an outsider's.
    projectState.members = [{ address: ENDORSER.toUpperCase() }];

    await clickEndorse();

    await waitFor(() => expect(endorsedEvents()).toHaveLength(1));
    expect(endorsedEvents()[0][1]).toMatchObject({ endorser_is_member: true });
  });

  it("emits nothing when the wallet cannot be prepared", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    await clickEndorse();

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    expect(mockAttest).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("never puts the endorser address or comment on the event", async () => {
    await clickEndorse();

    await waitFor(() => expect(endorsedEvents()).toHaveLength(1));
    const serialised = JSON.stringify(endorsedEvents()[0]);
    expect(serialised).not.toContain(ENDORSER);
    expect(Object.keys(endorsedEvents()[0][1])).toEqual(["project_id", "endorser_is_member"]);
  });
});
