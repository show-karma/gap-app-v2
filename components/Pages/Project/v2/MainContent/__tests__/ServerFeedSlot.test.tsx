/**
 * The slot is the only thing standing between the activity-feed twin and the
 * HTML. If its server snapshot ever reported a takeover, the twin would vanish
 * from the markup silently — the same crawlability loss E-7b named, with no
 * failing test anywhere. So the server render is pinned directly.
 */
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { ServerFeedSlot } from "../ServerFeedSlot";
import {
  __resetServerFeedTakeoverForTests,
  usePublishServerFeedTakeover,
} from "../serverFeedTakeover";

function Takeover({ hasTakenOver }: { hasTakenOver: boolean }) {
  usePublishServerFeedTakeover(hasTakenOver);
  return null;
}

describe("ServerFeedSlot", () => {
  beforeEach(() => {
    __resetServerFeedTakeoverForTests();
  });

  it("renders its children into the server markup", () => {
    const html = renderToString(
      <ServerFeedSlot>
        <p>Grant Approved</p>
      </ServerFeedSlot>
    );

    expect(html).toContain("Grant Approved");
  });

  it("renders the twin plainly, never hidden — a hidden twin is the same loss", () => {
    const html = renderToString(
      <ServerFeedSlot>
        <p>Endorsement</p>
      </ServerFeedSlot>
    );

    expect(html).not.toContain("display:none");
    expect(html).not.toContain("hidden");
  });

  it("keeps the twin on screen until the interactive feed takes over", () => {
    render(
      <>
        <ServerFeedSlot>
          <div data-testid="twin">Epoch 6</div>
        </ServerFeedSlot>
        <Takeover hasTakenOver={false} />
      </>
    );

    expect(screen.getByTestId("twin")).toBeInTheDocument();
  });

  it("drops the twin once the takeover is published", () => {
    render(
      <>
        <ServerFeedSlot>
          <div data-testid="twin">Epoch 6</div>
        </ServerFeedSlot>
        <Takeover hasTakenOver />
      </>
    );

    expect(screen.queryByTestId("twin")).not.toBeInTheDocument();
  });

  it("returns to the twin when the interactive feed unmounts, so the next project starts from it", () => {
    const { unmount } = render(<Takeover hasTakenOver />);
    unmount();

    render(
      <ServerFeedSlot>
        <div data-testid="twin">Epoch 6</div>
      </ServerFeedSlot>
    );

    expect(screen.getByTestId("twin")).toBeInTheDocument();
  });
});
