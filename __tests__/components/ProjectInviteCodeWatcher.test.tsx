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

/** Mirrors how ProjectProfileLayout renders it: inside a local Suspense. */
function renderWatcher() {
  return render(
    <Suspense fallback={null}>
      <ProjectInviteCodeWatcher />
    </Suspense>
  );
}

describe("ProjectInviteCodeWatcher", () => {
  beforeEach(() => {
    mockInviteCode = null;
    mockOpenContributorProfileModal = vi.fn();
  });

  it("opens the contributor profile modal when invite-code is in the URL", () => {
    mockInviteCode = "0x7232abc123";
    renderWatcher();

    expect(mockOpenContributorProfileModal).toHaveBeenCalledTimes(1);
  });

  it("does not open the modal when no invite-code is present", () => {
    mockInviteCode = null;
    renderWatcher();

    expect(mockOpenContributorProfileModal).not.toHaveBeenCalled();
  });

  it("opens the modal only once, so closing it does not immediately re-open it", () => {
    mockInviteCode = "0x7232abc123";
    const { rerender } = renderWatcher();

    expect(mockOpenContributorProfileModal).toHaveBeenCalledTimes(1);

    rerender(
      <Suspense fallback={null}>
        <ProjectInviteCodeWatcher />
      </Suspense>
    );

    expect(mockOpenContributorProfileModal).toHaveBeenCalledTimes(1);
  });

  it("renders no DOM of its own — it is an effect host, not UI", () => {
    mockInviteCode = "0x7232abc123";
    const { container } = renderWatcher();

    expect(container).toBeEmptyDOMElement();
  });
});
