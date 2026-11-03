import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AutoFollowUpToggle } from "@/components/Inbox/AutoFollowUpToggle";
import { SlackUserConnectCard } from "@/components/Pages/Admin/SlackOauth/SlackUserConnectCard";

vi.mock("@/utilities/enviromentVars", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utilities/enviromentVars")>();
  return { ...actual, envVars: { ...actual.envVars, SLACK_FOLLOW_UP_ENABLED: false } };
});

vi.mock("@/hooks/useSlackOauth", () => ({
  useSlackUserConnections: () => ({ isLoading: false, data: [] }),
  useStartSlackUserConnect: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDisconnectSlackUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("Slack follow-up flag off", () => {
  it("hides the auto follow-up checkbox", () => {
    const { container } = render(
      <AutoFollowUpToggle
        id="x"
        checked={false}
        slack={{ status: "connected", settingsHref: "/settings" }}
        onCheckedChange={() => undefined}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("hides the Slack account card", () => {
    const { container } = render(<SlackUserConnectCard communitySlug="filecoin" />);
    expect(container).toBeEmptyDOMElement();
  });
});
