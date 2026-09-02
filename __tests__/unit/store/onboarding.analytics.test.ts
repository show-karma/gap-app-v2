/**
 * @file Tests for the onboarding walkthrough's analytics.
 *
 * Three behaviours carry the whole funnel: a step is only reported while the
 * walkthrough is actually open (so restoring the store's default does not look
 * like a user navigating); a dismiss reports the step the user stopped on
 * rather than the step the store resets to; and closing ON the last step is a
 * completion rather than a dismissal — counting those as drop-offs made the
 * activation board show nobody ever finishing.
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

  it("reports a completion when the walkthrough is closed on the last step", () => {
    useOnboarding.setState({ isOnboardingOpen: true, onboardingStep: "structure" });

    useOnboarding.getState().setIsOnboarding(false);

    expect(track).toHaveBeenCalledWith("onboarding_completed", {});
    expect(track).not.toHaveBeenCalledWith("onboarding_dismissed", expect.anything());
  });

  it.each([["welcome"], ["project"], ["grants"], ["updates-milestones"]] as const)(
    "reports closing on %s as a dismissal, not a completion",
    (step) => {
      useOnboarding.setState({ isOnboardingOpen: true, onboardingStep: step });

      useOnboarding.getState().setIsOnboarding(false);

      expect(track).toHaveBeenCalledWith("onboarding_dismissed", { step });
      expect(track).not.toHaveBeenCalledWith("onboarding_completed", expect.anything());
    }
  );

  it("does not report a completion for a walkthrough that was never open", () => {
    useOnboarding.setState({ onboardingStep: "structure" });

    useOnboarding.getState().setIsOnboarding(false);

    expect(track).not.toHaveBeenCalled();
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
