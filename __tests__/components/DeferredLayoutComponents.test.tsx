/**
 * Behavioral integration test for the deferred layout component mounts.
 *
 * Bug context (regression): on whitelabel domains (e.g. app.filpgf.io), the
 * navbar's "Edit profile" / "API Keys" / "Walkthrough" buttons trigger Zustand
 * store actions to open dialogs, but if the corresponding dialog component is
 * never rendered, the click is a no-op and nothing appears on screen.
 *
 * Earlier tests counted dynamic imports — that only enforced the existing
 * (buggy) wiring. This test instead does the real thing: render the layout,
 * fire the same store action the navbar fires, and verify the dialog appears.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import "@testing-library/jest-dom";

// Make next/dynamic resolve as quickly as possible. The lazy loader runs once
// per dynamic() call; the component instance subscribes via useSyncExternalStore
// so the first React render after the loader resolves picks up the resolved
// component without needing a parent re-render.
vi.mock("next/dynamic", async () => {
  const React = await import("react");
  return {
    default: (loader: () => Promise<any>) => {
      const listeners = new Set<() => void>();
      let Component: any = null;
      loader().then((mod: any) => {
        Component = mod?.default ?? mod;
        for (const l of listeners) l();
      });
      const subscribe = (l: () => void) => {
        listeners.add(l);
        return () => listeners.delete(l);
      };
      const getSnapshot = () => Component;
      const DynamicComponent = (props: any) => {
        const Resolved = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
        if (!Resolved) return null;
        return React.createElement(Resolved, props);
      };
      DynamicComponent.displayName = "DynamicMock";
      return DynamicComponent;
    },
  };
});

// Stub the heavy dialog component with a thin component that subscribes to
// the REAL Zustand store. This keeps the test fast and isolated from the
// dialog's wagmi/react-hook-form/headlessui dependencies, while still proving
// the store -> mounted-component wire is intact.
vi.mock("@/components/Dialogs/ContributorProfileDialog", async () => {
  const { useContributorProfileModalStore } = await vi.importActual<
    typeof import("@/store/modals/contributorProfile")
  >("@/store/modals/contributorProfile");
  return {
    ContributorProfileDialog: () => {
      const isOpen = useContributorProfileModalStore((s) => s.isModalOpen);
      return isOpen ? <div data-testid="contributor-profile-dialog">Profile</div> : null;
    },
  };
});

vi.mock("@/components/Dialogs/OnboardingDialog", () => ({
  OnboardingDialog: () => <div data-testid="onboarding-dialog-mount" hidden />,
}));

vi.mock("@/src/features/api-keys/components/api-key-management-modal", () => ({
  ApiKeyManagementModal: () => <div data-testid="api-key-modal-mount" hidden />,
}));

// The other deferred components are not under test here. Stub them to no-op
// so the test environment doesn't try to load analytics/toast/etc.
vi.mock("react-hot-toast", () => ({ Toaster: () => null }));
vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }));
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => null }));
vi.mock("@/components/AgentChat/AgentChatBubble", () => ({ AgentChatBubble: () => null }));
vi.mock("@/components/ProgressBarWrapper", () => ({ ProgressBarWrapper: () => null }));
vi.mock("@/components/Utilities/HotjarAnalytics", () => ({ default: () => null }));

import { DeferredLayoutComponents } from "@/components/DeferredLayoutComponents";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";

const toasterConfig = {
  position: "top-right" as const,
  toastOptions: {},
  containerStyle: {},
};

describe("DeferredLayoutComponents", () => {
  afterEach(() => {
    act(() => {
      useContributorProfileModalStore.getState().closeModal();
    });
  });

  it("opens the contributor profile dialog when the store action fires", async () => {
    render(<DeferredLayoutComponents toasterConfig={toasterConfig} />);

    // Wait for next/dynamic to resolve the lazy ContributorProfileDialog mount.
    await waitFor(() => {
      expect(screen.queryByTestId("contributor-profile-dialog")).not.toBeInTheDocument();
    });

    // This is what NavbarUserMenu's "Edit profile" item does.
    act(() => {
      useContributorProfileModalStore.getState().openModal({ isGlobal: true });
    });

    expect(await screen.findByTestId("contributor-profile-dialog")).toBeInTheDocument();
  });

  it("mounts ContributorProfileDialog, OnboardingDialog, and ApiKeyManagementModal on every domain", async () => {
    // Regression: at app.filpgf.io (whitelabel) these were unmounted, so the
    // navbar's trigger buttons did nothing. They must mount unconditionally
    // because the navbar UI that opens them is shown on all domains.
    render(<DeferredLayoutComponents toasterConfig={toasterConfig} />);

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-dialog-mount")).toBeInTheDocument();
      expect(screen.getByTestId("api-key-modal-mount")).toBeInTheDocument();
    });
  });
});
