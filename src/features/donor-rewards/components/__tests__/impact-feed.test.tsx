/**
 * Unit tests for donor-rewards/components/impact-feed.tsx.
 *
 * A read quest pays out once, on whichever update is read next. The feed must
 * advertise that one-time bonus on a single card, not on every unread card, or
 * the promised rewards overstate what reading them all actually earns.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RewardsProvider } from "../../state/rewards-context";
import { ImpactFeed } from "../impact-feed";

function renderFeed() {
  return render(
    <RewardsProvider>
      <ImpactFeed />
    </RewardsProvider>
  );
}

describe("ImpactFeed quest-bonus display", () => {
  it("advertises the one-time read-quest bonus on only the first unread card", () => {
    renderFeed();

    // The initial fixture has one read quest one read away from completion, so
    // the +60 bonus must be promised exactly once, not on every unread card.
    expect(screen.getAllByText(/Completes quest/i)).toHaveLength(1);

    // First unread card carries the bonus (15 base + 60 quest); the other
    // unread cards show only their base reward.
    expect(screen.getByRole("button", { name: /Mark as read · \+75 IP/ })).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Mark as read · \+15 IP/ }).length
    ).toBeGreaterThan(0);
  });
});
