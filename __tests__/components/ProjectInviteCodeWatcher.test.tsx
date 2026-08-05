/**
 * @file Tests for ProjectInviteCodeWatcher
 * @description The invite-code reader was extracted out of ProjectProfileLayout
 * so that `useSearchParams` sits inside its own Suspense boundary instead of
 * bailing the project's server-rendered identity shell out to client-side
 * rendering (DEV-612). These tests cover the behaviour in isolation; the
 * layout-level tests in ProjectProfileLayout.invite-code.test.tsx keep
 * covering the same behaviour through the layout, which is the regression
 * guard that the watcher is still rendered in every branch.
 */
import { render } from "@testing-library/react";
import { Suspense } from "react";

let mockInviteCode: string | null = null;
let mockOpenContributorProfileModal: vi.Mock;

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "invite-code" ? mockInviteCode : null),
  }),
}));

vi.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    openModal: mockOpenContributorProfileModal,
  }),
}));

import { ProjectInviteCodeWatcher } from "@/components/Pages/Project/v2/Layout/ProjectInviteCodeWatcher";

/**
 * Mirrors how ProjectProfileLayout renders it: inside a local Suspense, with
 * the open-once latch owned by the caller.
 */
function renderWatcher(hasOpened = false) {
  const onOpen = vi.fn();
  const ui = (opened: boolean) => (
    <Suspense fallback={null}>
      <ProjectInviteCodeWatcher hasOpened={opened} onOpen={onOpen} />
    </Suspense>
  );
  const result = render(ui(hasOpened));
  return { ...result, onOpen, ui };
}

describe("ProjectInviteCodeWatcher", () => {
  beforeEach(() => {
    mockInviteCode = null;
    mockOpenContributorProfileModal = vi.fn();
  });

  it("opens the contributor profile modal when invite-code is in the URL", () => {
    mockInviteCode = "0x7232abc123";
    const { onOpen } = renderWatcher();

    expect(mockOpenContributorProfileModal).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("does not open the modal when no invite-code is present", () => {
    mockInviteCode = null;
    const { onOpen } = renderWatcher();

    expect(mockOpenContributorProfileModal).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open the modal when the caller says it has already opened", () => {
    mockInviteCode = "0x7232abc123";
    renderWatcher(true);

    expect(mockOpenContributorProfileModal).not.toHaveBeenCalled();
  });

  it("stays closed after a remount once the caller has latched — the caller owns the guard", () => {
    // ProjectProfileLayout renders this from branch returns with different root
    // element types, so React remounts it when the project resolves. A guard
    // held in local state would reset here and re-open the modal.
    mockInviteCode = "0x7232abc123";
    const { unmount, ui } = renderWatcher(false);

    expect(mockOpenContributorProfileModal).toHaveBeenCalledTimes(1);

    // Remount with the caller's latch now set, as the layout would.
    unmount();
    render(ui(true));

    expect(mockOpenContributorProfileModal).toHaveBeenCalledTimes(1);
  });

  it("renders no DOM of its own — it is an effect host, not UI", () => {
    mockInviteCode = "0x7232abc123";
    const { container } = renderWatcher();

    expect(container).toBeEmptyDOMElement();
  });
});
