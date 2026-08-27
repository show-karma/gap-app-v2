/**
 * @file Tests for the onboarding walkthrough's analytics.
 *
 * Two behaviours carry the whole funnel: a step is only reported while the
 * walkthrough is actually open (so restoring the store's default does not look
 * like a user navigating), and a dismiss reports the step the user stopped on
 * rather than the step the store resets to.
 */

import { useOnboarding } from "@/store/modals/onboarding";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const reset = () => useOnboarding.setState({ isOnboardingOpen: false, onboardingStep: "welcome" });

describe("onboarding store analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
  });

  it("reports each step the user walks through", () => {
    useOnboarding.setState({ isOnboardingOpen: true });

    useOnboarding.getState().changeOnboardingStep("grants");

    expect(track).toHaveBeenCalledWith("onboarding_step_viewed", { step: "grants" });
    expect(useOnboarding.getState().onboardingStep).toBe("grants");
  });

  it("stays silent when the walkthrough is closed", () => {
    useOnboarding.getState().changeOnboardingStep("project");

    expect(track).not.toHaveBeenCalled();
    // The step is still applied — only the reporting is gated.
    expect(useOnboarding.getState().onboardingStep).toBe("project");
  });

  it("reports the step the user abandoned, not the reset default", () => {
    useOnboarding.setState({ isOnboardingOpen: true, onboardingStep: "updates-milestones" });

    useOnboarding.getState().setIsOnboarding(false);

    expect(track).toHaveBeenCalledWith("onboarding_dismissed", { step: "updates-milestones" });
  });

  it("does not report a dismiss for a walkthrough that was never open", () => {
    useOnboarding.getState().setIsOnboarding(false);

    expect(track).not.toHaveBeenCalled();
  });

  it("does not report a dismiss when the walkthrough is opened", () => {
    useOnboarding.getState().setIsOnboarding(true);

    expect(track).not.toHaveBeenCalledWith("onboarding_dismissed", expect.anything());
  });
});
