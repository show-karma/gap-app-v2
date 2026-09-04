/**
 * @file Emit-site coverage for `project_merged`.
 *
 * Catalog: `{ source_project_id, target_project_id }`.
 *
 * The direction of a merge is the only thing this event says, and the two
 * properties are both opaque 0x uids — so a swap between them is completely
 * invisible downstream while inverting what the data means. The tests below
 * pin the direction explicitly: `source` is the project being merged away
 * (the one currently open), `target` is the primary project it points at.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  mockTrack,
  mockAttest,
  mockSetupChainAndWallet,
  mockSearchProjects,
  mockRefreshProject,
  mockShowSuccess,
  pointerUid,
} = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockAttest: vi.fn(),
  mockSetupChainAndWallet: vi.fn(),
  mockSearchProjects: vi.fn(),
  mockRefreshProject: vi.fn(),
  mockShowSuccess: vi.fn(),
  // Mutable so the never-indexes test can give its long-lived poll a pointer
  // uid the restored mock never returns.
  pointerUid: { current: "0xpointer" },
}));

const SOURCE_PROJECT_UID = "0x1111111111111111111111111111111111111111";
const TARGET_PROJECT_UID = "0x2222222222222222222222222222222222222222";
const POINTER_UID = "0xpointer";

vi.mock("@/utilities/analytics/client", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock("@show-karma/karma-gap-sdk", () => ({
  ProjectPointer: class {
    uid = pointerUid.current;
    chainID = 10;
    attest = mockAttest;
  },
}));

vi.mock("@headlessui/react", () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const MockDialog = Object.assign(Passthrough, { Panel: Passthrough, Title: Passthrough });
  const MockTransition = Object.assign(
    ({ show, children }: { show?: boolean; children: React.ReactNode }) =>
      show === false ? null : <div>{children}</div>,
    { Child: Passthrough }
  );
  return { Dialog: MockDialog, Transition: MockTransition, Fragment: "div" };
});

// Run the search callback synchronously; the tests fire one change event, so
// one edit still means one search.
vi.mock("lodash.debounce", () => ({
  default: (fn: (...args: unknown[]) => unknown) => {
    const wrapped = (...args: unknown[]) => fn(...args);
    wrapped.cancel = () => {};
    wrapped.flush = () => {};
    return wrapped;
  },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("wagmi", () => ({ useAccount: () => ({ address: "0xabc", chain: { id: 10 } }) }));

vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ authenticated: true }) }));
vi.mock("@/hooks/useGap", () => ({ useGap: () => ({ gap: {} }) }));
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({ setupChainAndWallet: mockSetupChainAndWallet }),
}));
vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: vi.fn(),
    changeStepperStep: vi.fn(),
    showLoading: vi.fn(),
    showSuccess: mockShowSuccess,
    showError: vi.fn(),
    dismiss: vi.fn(),
  }),
}));
vi.mock("@/utilities/eas-wagmi-utils", () => ({ useSigner: () => ({}) }));
vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: () => ({ data: { roles: { roles: [] } }, isLoading: false }),
}));
vi.mock("@/src/core/rbac/types", () => ({ Role: { SUPER_ADMIN: "SUPER_ADMIN" } }));

vi.mock("@/services/project-search.service", () => ({
  searchProjects: (...args: unknown[]) => mockSearchProjects(...args),
}));

vi.mock("@/store/modals/merge", () => ({
  useMergeModalStore: () => ({ isMergeModalOpen: true, setIsMergeModalOpen: vi.fn() }),
}));

vi.mock("@/store", () => ({
  useProjectStore: (selector: (s: unknown) => unknown) =>
    selector({
      project: {
        uid: SOURCE_PROJECT_UID,
        chainID: 10,
        details: { slug: "source", title: "Source" },
        symlinks: [],
        pointers: [{ uid: POINTER_UID }],
      },
      refreshProject: mockRefreshProject,
      isProjectAdmin: true,
      setIsProjectAdmin: vi.fn(),
    }),
}));

vi.mock("@/utilities/api/client", () => ({ api: { post: vi.fn().mockResolvedValue({}) } }));
vi.mock("@/utilities/indexer", () => ({ INDEXER: { ATTESTATION_LISTENER: () => "/listener" } }));
vi.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
      OVERVIEW: (slug: string) => `/project/${slug}`,
      // The search result list builds an href per row; without this the whole
      // list throws before any result renders.
      GRANTS: (slug: string) => `/project/${slug}/grants`,
    },
  },
}));
vi.mock("@/utilities/sanitize", () => ({ sanitizeInput: (v: unknown) => v }));
// Resolves to `components/EthereumAddressToProfileName` (the import in the
// dialog is `../EthereumAddressToProfileName`, i.e. one level above Dialogs).
// Mocking the wrong path lets the real component load and throw, which takes
// the whole result list down with it.
vi.mock("@/components/EthereumAddressToProfileName", () => ({
  default: () => <span>owner</span>,
}));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));
vi.mock("@/components/Utilities/Spinner", () => ({ Spinner: () => <div /> }));

import { MergeProjectDialog } from "@/components/Dialogs/MergeProjectDialog";

const mergedEvents = () => mockTrack.mock.calls.filter(([name]) => name === "project_merged");

async function selectTargetAndMerge() {
  render(<MergeProjectDialog />);

  // Drive the real search → select flow: typing populates the result list, and
  // clicking a result is what sets the primary (target) project.
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "target project" } });

  const result = await screen.findByText("Target");
  fireEvent.click(result);

  const mergeButton = await screen.findByRole("button", { name: /merge to primary project/i });
  await waitFor(() => expect(mergeButton).toBeEnabled());
  fireEvent.click(mergeButton);
}

beforeEach(() => {
  vi.clearAllMocks();
  pointerUid.current = POINTER_UID;
  mockSearchProjects.mockResolvedValue([
    {
      uid: TARGET_PROJECT_UID,
      owner: "0xowner",
      details: { title: "Target", slug: "target" },
    },
  ]);
  mockAttest.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  mockSetupChainAndWallet.mockResolvedValue({
    walletSigner: {},
    gapClient: { findSchema: vi.fn(() => ({ uid: "schema" })) },
  });
  // The poll waits for the pointer to appear on the refreshed project.
  mockRefreshProject.mockResolvedValue({ pointers: [{ uid: POINTER_UID }] });
});

describe("MergeProjectDialog analytics", () => {
  it("emits project_merged with exactly the catalog properties", async () => {
    await selectTargetAndMerge();

    await waitFor(() => expect(mergedEvents()).toHaveLength(1), { timeout: 4000 });
    expect(Object.keys(mergedEvents()[0][1] as object).sort()).toEqual([
      "source_project_id",
      "target_project_id",
    ]);
  });

  it("records the merge direction correctly (source = the project being merged away)", async () => {
    await selectTargetAndMerge();

    await waitFor(() => expect(mergedEvents()).toHaveLength(1), { timeout: 4000 });
    // Both values are opaque uids, so a swap would be invisible downstream
    // while inverting the meaning of every merge in the data.
    expect(mergedEvents()[0][1]).toEqual({
      source_project_id: SOURCE_PROJECT_UID,
      target_project_id: TARGET_PROJECT_UID,
    });
  });

  it("emits nothing when the wallet cannot be prepared", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    await selectTargetAndMerge();

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    expect(mockAttest).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("does not report a merge when the pointer never indexes", async () => {
    // Polling outlives this test; a distinct pointer uid keeps it inert once
    // `beforeEach` restores the indexed mock for the next test.
    pointerUid.current = "0xpointer-never-indexed";
    mockRefreshProject.mockResolvedValue({ pointers: [] });

    await selectTargetAndMerge();

    await waitFor(() => expect(mockAttest).toHaveBeenCalled(), { timeout: 4000 });
    expect(mergedEvents()).toHaveLength(0);
  });

  it("never puts project titles or the owner address on the event", async () => {
    await selectTargetAndMerge();

    await waitFor(() => expect(mergedEvents()).toHaveLength(1), { timeout: 4000 });
    const serialised = JSON.stringify(mergedEvents()[0]);
    expect(serialised).not.toContain("Target");
    expect(serialised).not.toContain("0xowner");
  });
});
