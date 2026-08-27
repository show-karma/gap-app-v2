/**
 * @file Analytics tests for `onboarding_started`.
 *
 * Opening the walkthrough emits two events, not one: `onboarding_started` and
 * an immediate `onboarding_step_viewed` for "welcome". That pairing is
 * deliberate — the store only reports a step change *while* the walkthrough is
 * open, so without the explicit first emit the funnel would show every user
 * starting on step two. It is also easy to "tidy up" later, which is why the
 * pairing and the order are asserted rather than just the started event.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const onboarding = vi.hoisted(() => ({ setIsOnboarding: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  // No projects → the empty state (which owns the walkthrough CTA) renders.
  // `data` is the project array itself, not a wrapper object.
  useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, address: "0xabc", ready: true }),
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }));
vi.mock("@/store/modals/onboarding", () => ({
  useOnboarding: () => ({ setIsOnboarding: onboarding.setIsOnboarding }),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));
vi.mock("@/components/Utilities/MarkdownPreview", () => ({ MarkdownPreview: () => <div /> }));
vi.mock("@/components/Utilities/Pagination", () => ({ default: () => <div /> }));
vi.mock("@/components/Utilities/ProfilePicture", () => ({ ProfilePicture: () => <div /> }));
vi.mock("@/utilities/sdk/projects/fetchMyProjects", () => ({ fetchMyProjects: vi.fn() }));
vi.mock("@/utilities/pages", () => ({
  PAGES: { PROJECT: { GRANTS: () => "/p" }, MY_PROJECTS: "/" },
}));
vi.mock("@/components/Pages/MyProjects/LoadingCard", () => ({ LoadingCard: () => <div /> }));
vi.mock("@/components/Pages/MyProjects/EmptyProjectsState", () => ({
  EmptyProjectsState: ({ onStartWalkthrough }: { onStartWalkthrough: () => void }) => (
    <button type="button" onClick={onStartWalkthrough}>
      Start walkthrough
    </button>
  ),
}));

import MyProjects from "@/components/Pages/MyProjects";

const analyticsCalls = () => vi.mocked(track).mock.calls;
const eventNames = () => analyticsCalls().map(([name]) => name);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MyProjects onboarding analytics", () => {
  it("emits onboarding_started with a stable entry point, not a pathname", () => {
    render(<MyProjects />);
    fireEvent.click(screen.getByRole("button", { name: /start walkthrough/i }));

    const started = analyticsCalls().find(([name]) => name === "onboarding_started");
    expect(started).toBeDefined();
    const props = started?.[1] as { entry_point: string };
    expect(Object.keys(props)).toEqual(["entry_point"]);
    // Entry points are surface ids, never routes (A6/B15).
    expect(props.entry_point).not.toContain("/");
  });

  it("also reports arriving on the welcome step, in that order", () => {
    render(<MyProjects />);
    fireEvent.click(screen.getByRole("button", { name: /start walkthrough/i }));

    // The store only reports step changes once the walkthrough is open, so
    // without this second emit every user would appear to start on step two.
    expect(eventNames().slice(0, 2)).toEqual(["onboarding_started", "onboarding_step_viewed"]);
    const stepProps = analyticsCalls()[1][1] as { step: string };
    expect(stepProps).toEqual({ step: "welcome" });
  });

  it("opens the walkthrough as well as reporting it", () => {
    render(<MyProjects />);
    fireEvent.click(screen.getByRole("button", { name: /start walkthrough/i }));

    expect(onboarding.setIsOnboarding).toHaveBeenCalledWith(true);
  });

  it("reports nothing until the walkthrough is actually started", () => {
    render(<MyProjects />);

    expect(eventNames()).not.toContain("onboarding_started");
  });

  it("puts no wallet address on either onboarding event", () => {
    render(<MyProjects />);
    fireEvent.click(screen.getByRole("button", { name: /start walkthrough/i }));

    // The old onboarding events shipped the connected address; identity now
    // lives on the Mixpanel profile.
    expect(JSON.stringify(analyticsCalls())).not.toContain("0xabc");
  });
});
