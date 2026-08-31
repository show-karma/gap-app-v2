/**
 * The mock handles the two `ProjectDialog` analytics suites share.
 *
 * Split out of `project-dialog-analytics.mocks.tsx` so that file exports
 * NOTHING: it declares components inside its `vi.mock` factories, and a `.tsx`
 * that exports non-components alongside them trips react-doctor's
 * `only-export-components`. No JSX here, so no components to collide with.
 */

export const mockStartAttestation = vi.fn();
export const mockGetAttestationSigner = vi.fn();
export const mockEnsureCorrectChain = vi.fn();
export const mockGetProjectById = vi.fn();
export const mockUpdateProject = vi.fn();
export const mockTrack = vi.fn();

/** Reassigned per case by the suites; the mock factories read them live. */
export let mockProjectAttest: vi.Mock;
export let mockSetupChainAndWallet: vi.Mock;

export const setProjectAttest = (fn: vi.Mock) => {
  mockProjectAttest = fn;
};
export const setSetupChainAndWallet = (fn: vi.Mock) => {
  mockSetupChainAndWallet = fn;
};

/** A `vi.hoisted` binding cannot itself be exported; the suites go through this. */
const networkMockState = vi.hoisted(() => ({ showNetworkSelector: false }));
export const setShowNetworkSelector = (value: boolean) => {
  networkMockState.showNetworkSelector = value;
};
export const getNetworkMockState = () => networkMockState;

export const eventsNamed = (name: string) => mockTrack.mock.calls.filter(([n]) => n === name);
