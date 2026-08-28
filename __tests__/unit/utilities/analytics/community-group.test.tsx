/**
 * @file Tests for the community group binding (utilities/analytics/community-group.ts).
 *
 * Two bugs shaped this module, and the tests are split along them.
 *
 * The first: `/community/[communityId]` accepts either a slug or a uid, so
 * grouping on the URL segment reached Mixpanel as two different groups for one
 * community, and a slug change split its history in two. The binding is by the
 * uid the layout resolved.
 *
 * The second: this module used to call `set_group` itself. The layout mounts on
 * its own schedule with no view of whether Privy has resolved, so on a reload
 * that write landed while Mixpanel still held the PREVIOUS session's identity —
 * joining the wrong person to the community. It now only publishes the uid;
 * `AnalyticsProvider` performs the write after identity is settled, and the
 * ordering is covered there.
 */

import { render } from "@testing-library/react";
import * as analyticsClient from "@/utilities/analytics/client";
import {
  __resetCommunityGroupForTests,
  useBoundCommunityId,
  useCommunityAnalyticsGroup,
} from "@/utilities/analytics/community-group";

vi.mock("@/utilities/analytics/client", () => ({
  setCommunityGroup: vi.fn(),
  registerSuperProperties: vi.fn(),
  unregisterSuperProperty: vi.fn(),
}));

function Binder({ uid }: { uid: string | null }) {
  useCommunityAnalyticsGroup(uid);
  return null;
}

function Reader() {
  const bound = useBoundCommunityId();
  return <span data-testid="bound">{bound ?? "none"}</span>;
}

describe("useCommunityAnalyticsGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetCommunityGroupForTests();
  });

  it("publishes the resolved uid, not whatever the URL said", () => {
    const { getByTestId } = render(
      <>
        <Reader />
        <Binder uid="0xcommunityuid" />
      </>
    );

    expect(getByTestId("bound").textContent).toBe("0xcommunityuid");
  });

  it("publishes nothing when the route names no real community", () => {
    const { getByTestId } = render(
      <>
        <Reader />
        <Binder uid={null} />
      </>
    );

    expect(getByTestId("bound").textContent).toBe("none");
  });

  it("unpublishes when the visitor leaves the community subtree", () => {
    function Tree({ inCommunity }: { inCommunity: boolean }) {
      return (
        <>
          <Reader />
          {inCommunity && <Binder uid="0xcommunityuid" />}
        </>
      );
    }

    const { getByTestId, rerender } = render(<Tree inCommunity />);
    rerender(<Tree inCommunity={false} />);

    // Without this, events on the next screen are still attributed to the
    // community the visitor just left.
    expect(getByTestId("bound").textContent).toBe("none");
  });

  it("republishes when the community changes without a remount", () => {
    const { getByTestId, rerender } = render(
      <>
        <Reader />
        <Binder uid="0xfirst" />
      </>
    );
    expect(getByTestId("bound").textContent).toBe("0xfirst");

    rerender(
      <>
        <Reader />
        <Binder uid="0xsecond" />
      </>
    );

    expect(getByTestId("bound").textContent).toBe("0xsecond");
  });

  it("never touches the analytics SDK itself", () => {
    // The whole point of the split. A write from here would race Privy, and the
    // layout has no way to know that.
    const { unmount } = render(<Binder uid="0xcommunityuid" />);
    unmount();

    expect(analyticsClient.setCommunityGroup).not.toHaveBeenCalled();
    expect(analyticsClient.registerSuperProperties).not.toHaveBeenCalled();
    expect(analyticsClient.unregisterSuperProperty).not.toHaveBeenCalled();
  });
});

describe("useBoundCommunityId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetCommunityGroupForTests();
  });

  it("reports nothing before a community is bound", () => {
    const { getByTestId } = render(<Reader />);

    expect(getByTestId("bound").textContent).toBe("none");
  });

  it("reaches a reader outside the community subtree", () => {
    // AnalyticsProvider is mounted from the ROOT layout, not inside the
    // community tree, which is why this is a module store and not context.
    const { getByTestId } = render(
      <>
        <Reader />
        <Binder uid="0xcommunityuid" />
      </>
    );

    expect(getByTestId("bound").textContent).toBe("0xcommunityuid");
  });

  it("clears for the reader when the binder unmounts", () => {
    function Tree({ inCommunity }: { inCommunity: boolean }) {
      return (
        <>
          <Reader />
          {inCommunity && <Binder uid="0xcommunityuid" />}
        </>
      );
    }

    const { getByTestId, rerender } = render(<Tree inCommunity />);
    expect(getByTestId("bound").textContent).toBe("0xcommunityuid");

    rerender(<Tree inCommunity={false} />);

    expect(getByTestId("bound").textContent).toBe("none");
  });
});
